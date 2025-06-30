import { useLocation, useNavigate } from "react-router-dom"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const ScorePage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const { target, input, durationSec } = location.state || {}

  // Compute correct characters
  let correct = 0
  if (target && input) {
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target[i]) correct++
    }
  }

  // Standard WPM formula: (correct chars / 5) / (duration in minutes)
  const wpm = durationSec > 0 ? ((correct / 5) / (durationSec / 60)) : 0
  const wpmInt = Math.round(wpm)
  const accuracy = input?.length > 0 ? (correct / input.length) * 100 : 0
  const mistakes = input?.length && correct >= 0 ? input.length - correct : 0

  const handlePlayAgain = () => navigate("/")

  if (!location.state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <h1 className="text-3xl font-bold mb-4">No Result Found</h1>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Typing Test
        </button>
      </div>
    )
  }

  // Chart data generation (fluctuating demo, ends at real values)
  const seconds = Math.max(1, Math.ceil(durationSec || 1))
  const timeLabels = Array.from({ length: seconds }, (_, i) => (i + 1).toString())
  if (seconds > 1 && durationSec % 1 !== 0) {
    timeLabels[seconds - 1] = durationSec.toFixed(1)
  }

  // Exact cumulative correct chars at each second
  let cumulativeCorrect = Array(seconds).fill(0)
  if (target && input && input.length > 0) {
    for (let i = 0; i < input.length; i++) {
      const charTime = ((i + 1) * durationSec) / input.length
      const secIdx = Math.min(Math.floor(charTime), seconds - 1)
      if (input[i] === target[i]) {
        cumulativeCorrect[secIdx] += 1
      }
    }
    // Make cumulative
    for (let i = 1; i < seconds; i++) {
      cumulativeCorrect[i] += cumulativeCorrect[i - 1]
    }
  }

  // WPM at each time point, using float for last point and ensuring last matches main WPM
  let wpmData = cumulativeCorrect.map((correctSoFar, i) => {
    let elapsedSec = i + 1
    if (i === seconds - 1 && durationSec % 1 !== 0) {
      elapsedSec = durationSec
      correctSoFar = correct // use total correct chars for last point
    }
    const timeMin = elapsedSec / 60
    return timeMin > 0 ? Math.round((correctSoFar / 5) / timeMin) : 0 // round to integer
  })
  // Ensure last value matches main WPM exactly
  if (wpmData.length > 0) {
    wpmData[wpmData.length - 1] = wpmInt
  }

  // Exact cumulative mistakes at each second
  let cumulativeMistakes = Array(seconds).fill(0)
  if (target && input && input.length > 0) {
    for (let i = 0; i < input.length; i++) {
      const charTime = ((i + 1) * durationSec) / input.length
      const secIdx = Math.min(Math.floor(charTime), seconds - 1)
      if (input[i] !== target[i]) {
        cumulativeMistakes[secIdx] += 1
      }
    }
    // Make cumulative
    for (let i = 1; i < seconds; i++) {
      cumulativeMistakes[i] += cumulativeMistakes[i - 1]
    }
  }

  const errorData = cumulativeMistakes

  const datasets = [
    {
      label: "WPM",
      data: wpmData,
      borderColor: "#facc15",
      backgroundColor: "#facc15",
      pointRadius: 0.1, // Point adder in graph
      pointHoverRadius: 4,
      borderWidth: 3,
      tension: 0.5,
      fill: false,
      yAxisID: "y",
      order: 1,
    },
    {
      label: "Mistakes",
      data: errorData,
      borderColor: "#b91c1c", // dark red
      backgroundColor: "#b91c1c",
      pointRadius: 0.1, // Point adder in graph
      pointBackgroundColor: "#b91c1c",
      borderWidth: 3,
      tension: 0.5,
      fill: false,
      yAxisID: "y",
      order: 2,
    },
  ]

  const data = {
    labels: timeLabels,
    datasets,
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "#22223b",
        titleColor: "#facc15",
        bodyColor: "#fff",
        borderColor: "#facc15",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.08)" },
        ticks: { color: "#9ca3af" },
        title: {
          display: true,
          text: "Time (s)",
          color: "#9ca3af",
        },
      },
      y: {
        beginAtZero: true,
        position: "left",
        grid: { color: "rgba(255,255,255,0.08)" },
        ticks: { color: "#9ca3af" },
        title: {
          display: true,
          text: "Words per Minute / Mistakes",
          color: "#9ca3af",
        },
      },
    },
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-8 bg-[#0f1826] text-gray-100">
      <h1 className="text-4xl font-extrabold -mt-5 mb-4 text-[#facc15]">Your Score</h1>

      <div className="w-full max-w-5xl bg-[#23242a] p-6 rounded-xl space-y-8 ">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div>
            <div className="uppercase text-gray-400 text-lg ">wpm</div>
            <div className="text-5xl font-bold text-[#facc15]">{wpmInt}</div>
          </div>
          <div>
            <div className="uppercase text-gray-400 text-lg">accuracy</div>
            <div className="text-5xl font-bold text-[#facc15]">{accuracy.toFixed(1)}%</div>
          </div>
          <div>
            <div className="uppercase text-gray-400 text-lg">mistakes</div>
            <div className="text-5xl font-bold text-[#b91c1c]">{mistakes}</div>
          </div>
          <div>
            <div className="uppercase text-gray-400 text-lg">characters</div>
            <div className="text-4xl font-bold text-[#38bdf8]">
              {correct} / {input?.length || 0}
            </div>
          </div>
          <div>
            <div className="uppercase text-gray-400 text-lg">time</div>
            <div className="text-4xl font-bold text-[#facc15]">{durationSec.toFixed(1)}s</div>
          </div>
        </div>
        <div className="bg-[#23242a] rounded-lg p-4">
          <Line data={data} options={options} height={120} />
        </div>
      </div>
      <div className="mt-6 text-white text-lg">
        <p>Thank you for playing! Keep practicing to improve your typing skills.</p>
      </div> 

      <div>
        <button onClick={() => navigate("/login")} className="mr-6 mt-6 px-8 py-3 rounded-full bg-yellow-400 text-black text-lg font-semibold hover:bg-yellow-500 transition cursor-pointer">
          Login to save your score
        </button>
      <button
        onClick={handlePlayAgain}
        className="mt-6 px-8 py-3 rounded-full bg-yellow-400 text-[#23242a] text-lg font-semibold hover:bg-yellow-500 transition cursor-pointer"
      >
        Play Again
      </button>
      </div>
    </div>
  )
}

export default ScorePage