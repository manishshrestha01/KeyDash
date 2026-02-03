import { useLocation, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { target, input, durationSec, wpm: stateWpm, acc: stateAcc, mistakes: stateMistakes, mistakenIndices } = location.state || {};

  // Compute basic stats from input/target as fallback
  let correct = 0;
  if (target && input) {
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target[i]) correct++;
    }
  }

  // Standard WPM formula based on currently-correct chars (fallback)
  const baseWpm = durationSec > 0 ? correct / 5 / (durationSec / 60) : 0;
  const baseWpmInt = Math.round(baseWpm);
  const baseAccuracy = input?.length > 0 ? (correct / input.length) * 100 : 0;
  const baseMistakes = input?.length && correct >= 0 ? input.length - correct : 0;

  // Prefer passed values from the mode (e.g., Timed) when available
  const displayWpm = typeof stateWpm !== "undefined" ? stateWpm : baseWpmInt;
  const displayAcc = typeof stateAcc !== "undefined" ? parseFloat(stateAcc) : parseFloat(baseAccuracy.toFixed(1));
  const displayMistakes = typeof stateMistakes !== "undefined" ? stateMistakes : baseMistakes;
  const displayedCorrectChars = Math.max(0, (input?.length || 0) - displayMistakes);

  // Chart data generation (fluctuating demo, ends at real values)
  const seconds = Math.max(1, Math.ceil(durationSec || 1));
  const timeLabels = Array.from({ length: seconds }, (_, i) =>
    (i + 1).toString()
  );
  if (seconds > 1 && durationSec % 1 !== 0) {
    timeLabels[seconds - 1] = durationSec.toFixed(1);
  }

  // Exact cumulative correct chars at each second.
  // If `mistakenIndices` is provided (Timed mode), treat any index in that array as a permanent mistake
  // so corrected characters don't remove mistakes from history.
  let cumulativeCorrect = Array(seconds).fill(0);
  let cumulativeMistakes = Array(seconds).fill(0);
  if (target && input && input.length > 0) {
    if (Array.isArray(mistakenIndices) && mistakenIndices.length > 0) {
      // Use mistakenIndices to compute typed and mistaken counts per second
      const typedPerSec = Array(seconds).fill(0);
      const mistakesPerSec = Array(seconds).fill(0);
      const mistakenSet = new Set(mistakenIndices);
      for (let i = 0; i < input.length; i++) {
        const charTime = ((i + 1) * durationSec) / input.length;
        const secIdx = Math.min(Math.floor(charTime), seconds - 1);
        typedPerSec[secIdx] += 1;
        if (mistakenSet.has(i)) mistakesPerSec[secIdx] += 1;
      }
      // Make cumulative
      for (let i = 1; i < seconds; i++) {
        typedPerSec[i] += typedPerSec[i - 1];
        mistakesPerSec[i] += mistakesPerSec[i - 1];
      }
      cumulativeMistakes = mistakesPerSec;
      cumulativeCorrect = typedPerSec.map((t, idx) => Math.max(0, t - mistakesPerSec[idx]));
    } else {
      for (let i = 0; i < input.length; i++) {
        const charTime = ((i + 1) * durationSec) / input.length;
        const secIdx = Math.min(Math.floor(charTime), seconds - 1);
        if (input[i] === target[i]) {
          cumulativeCorrect[secIdx] += 1;
        } else {
          cumulativeMistakes[secIdx] += 1;
        }
      }
      // Make cumulative
      for (let i = 1; i < seconds; i++) {
        cumulativeCorrect[i] += cumulativeCorrect[i - 1];
        cumulativeMistakes[i] += cumulativeMistakes[i - 1];
      }
    }
  }

  let wpmData = cumulativeCorrect.map((correctSoFar, i) => {
    let elapsedSec = i + 1;
    if (i === seconds - 1 && durationSec % 1 !== 0) {
      elapsedSec = durationSec;
      // If mistakenIndices used, our cumulativeCorrect already represents adjusted correct; otherwise fall back
      correctSoFar = Array.isArray(mistakenIndices) && mistakenIndices.length > 0 ? cumulativeCorrect[cumulativeCorrect.length - 1] : correct;
    }
    const timeMin = elapsedSec / 60;
    return timeMin > 0 ? Math.round(correctSoFar / 5 / timeMin) : 0; // round to integer
  });
  // Ensure last value matches main WPM exactly (prefer passed displayWpm)
  if (wpmData.length > 0) {
    wpmData[wpmData.length - 1] = displayWpm;
  }

  const errorData = cumulativeMistakes;

  const data = {
    labels: timeLabels,
    datasets: [
      {
        label: "WPM",
        data: wpmData,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251, 191, 36, 0.1)",
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: "y",
      },
      {
        label: "Errors",
        data: errorData,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: { 
        display: true,
        position: "top",
        labels: {
          color: "#9ca3af",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#fbbf24",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(251, 191, 36, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        titleFont: {
          family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          size: 14,
          weight: "600",
        },
        bodyFont: {
          family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          size: 13,
        },
      },
    },
    scales: {
      x: {
        grid: { 
          color: "rgba(255,255,255,0.05)",
          drawBorder: false,
        },
        ticks: { 
          color: "#6b7280",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          },
        },
        title: {
          display: true,
          text: "Time (seconds)",
          color: "#6b7280",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: true,
        grid: { 
          color: "rgba(255,255,255,0.05)",
          drawBorder: false,
        },
        ticks: { 
          color: "#fbbf24",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          },
        },
        title: {
          display: true,
          text: "WPM",
          color: "#fbbf24",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: { 
          color: "#ef4444",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          },
        },
        title: {
          display: true,
          text: "Errors",
          color: "#ef4444",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
        },
      },
    },
  };

  const handlePlayAgain = () => navigate("/");

  // Performance rating
  const getPerformanceRating = () => {
    if (displayWpm >= 80 && displayAcc >= 98) return { text: "Exceptional!", color: "text-purple-400" };
    if (displayWpm >= 60 && displayAcc >= 95) return { text: "Excellent!", color: "text-green-400" };
    if (displayWpm >= 40 && displayAcc >= 90) return { text: "Good Job!", color: "text-blue-400" };
    if (displayWpm >= 30 && displayAcc >= 85) return { text: "Keep Practicing!", color: "text-yellow-400" };
    return { text: "Room to Improve", color: "text-orange-400" };
  };

  const rating = getPerformanceRating();

  if (!location.state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
        <h2 className="text-3xl font-bold mb-4">No Result Found</h2>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-yellow-400 text-black rounded-full font-semibold hover:bg-yellow-500 transition"
        >
          Go to Typing Test
        </button>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center px-4 py-8 md:py-12 bg-[#0a0f1a]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Results
        </h1>
        <p className={`text-xl md:text-2xl font-medium ${rating.color}`}>
          {rating.text}
        </p>
      </motion.div>

      {/* Main Stats Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-4xl"
      >
        {/* Primary Stats - WPM & Accuracy */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* WPM Card */}
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50 backdrop-blur-xl">
            <div className="text-gray-400 text-sm md:text-base font-medium uppercase tracking-wider mb-2">
              Words Per Minute
            </div>
            <div className="text-5xl md:text-7xl font-bold text-yellow-400 tracking-tight">
              {displayWpm}
            </div>
            <div className="mt-2 text-gray-500 text-sm">
              wpm
            </div>
          </div>

          {/* Accuracy Card */}
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50 backdrop-blur-xl">
            <div className="text-gray-400 text-sm md:text-base font-medium uppercase tracking-wider mb-2">
              Accuracy
            </div>
            <div className={`text-5xl md:text-7xl font-bold tracking-tight ${displayAcc >= 95 ? 'text-green-400' : displayAcc >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {displayAcc.toFixed(1)}
            </div>
            <div className="mt-2 text-gray-500 text-sm">
              percent
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Errors */}
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-4 md:p-6 border border-gray-800/50">
            <div className="text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">
              Errors
            </div>
            <div className="text-2xl md:text-4xl font-bold text-red-400">
              {displayMistakes}
            </div>
          </div>

          {/* Characters */}
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-4 md:p-6 border border-gray-800/50">
            <div className="text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">
              Characters
            </div>
            <div className="text-2xl md:text-4xl font-bold text-blue-400">
              <span className="text-green-400">{displayedCorrectChars}</span>
              <span className="text-gray-500 text-lg md:text-2xl">/{input?.length || 0}</span>
            </div>
          </div>

          {/* Time */}
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-4 md:p-6 border border-gray-800/50">
            <div className="text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">
              Time
            </div>
            <div className="text-2xl md:text-4xl font-bold text-purple-400">
              {durationSec.toFixed(1)}
              <span className="text-lg md:text-xl text-gray-500">s</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-4 md:p-6 border border-gray-800/50"
        >
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">
            Performance Over Time
          </h3>
          <div className="h-64 md:h-80">
            <Line data={data} options={options} />
          </div>
        </motion.div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex flex-col sm:flex-row gap-4"
      >
        <button
          onClick={handlePlayAgain}
          className="px-8 py-4 rounded-full bg-yellow-400 text-black text-lg font-semibold hover:bg-yellow-500 hover:scale-105 transition-all duration-200 shadow-lg shadow-yellow-400/20"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate("/leaderboard")}
          className="px-8 py-4 rounded-full bg-transparent text-white text-lg font-semibold border border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all duration-200"
        >
          View Leaderboard
        </button>
      </motion.div>

      {/* Tip */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-gray-500 text-center text-sm max-w-md"
      >
        💡 Tip: Focus on accuracy first, speed will follow naturally with practice.
      </motion.p>
    </div>
  );
};

export default ScorePage;
