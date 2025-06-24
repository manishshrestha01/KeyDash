import { useLocation, useNavigate } from "react-router-dom"

const ScorePage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const { target, input, durationSec } = location.state || {}

  // Compute WPM, accuracy, mistakes
  const wordCount = target ? target.trim().split(/\s+/).length : 0
  const wpm = wordCount / (durationSec / 60)

  let correct = 0
  if (target && input) {
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target[i]) correct++
    }
  }

  const accuracy = target?.length > 0 ? (correct / target.length) * 100 : 0
  const mistakes = target?.length ? target.length - correct : 0

  const handlePlayAgain = () => navigate("/")

  if (!location.state) {
    // if user directly goes to /results without state
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-8 bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <h1 className="text-4xl font-extrabold mb-8">Your Score</h1>

      <div className="w-full max-w-md bg-gray-100 dark:bg-gray-900 p-6 rounded-xl shadow-xl space-y-5">
        <div className="flex justify-between text-xl">
          <span>WPM:</span>
          <span className="font-bold">{Math.round(wpm)}</span>
        </div>
        <div className="flex justify-between text-xl">
          <span>Accuracy:</span>
          <span className="font-bold">{accuracy.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xl">
          <span>Time Taken:</span>
          <span className="font-bold">{durationSec.toFixed(1)} sec</span>
        </div>
        <div className="flex justify-between text-xl">
          <span>Mistakes:</span>
          <span className="font-bold">{mistakes}</span>
        </div>
      </div>

      <button
        onClick={handlePlayAgain}
        className="mt-10 px-8 py-3 rounded-full bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition"
      >
        Play Again
      </button>
    </div>
  )
}

export default ScorePage
