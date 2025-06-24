import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const StatsChart = ({ wpm, accuracy, errors }) => {
  const data = {
    labels: ["WPM", "Accuracy", "Errors"],
    datasets: [
      {
        label: "Stats",
        data: [wpm, accuracy, errors],
        backgroundColor: [
          "rgba(37, 99, 235, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(239, 68, 68, 0.7)",
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        bodyColor: "#e2e2e2", // Tooltip text color
        titleColor: "#e2e2e2",
      },
    },
    scales: {
      x: {
        ticks: { color: "#e2e2e2" }, // X axis label color
        grid: { color: "rgba(255,255,255,0.15)" },
      },
      y: {
        ticks: { color: "#e2e2e2" }, // Y axis label color
        grid: { color: "rgba(255,255,255,0.15)" },
      },
    },
  };

  return <Bar className="" data={data} options={options} />;
};

export default StatsChart;
