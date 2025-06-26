import React from "react"
import { twMerge } from "tailwind-merge"

const ModesButton = ({ children, onClick, active, icon, theme = "dark" }) => {
  const baseClasses = `
    flex items-center gap-2 px-4 py-2 rounded-full text-xl font-semibold transition-all border
  `

  const themeClasses = {
    dark: active
      ? "bg-yellow-400 text-black border-yellow-400 shadow"
      : "bg-transparent text-white border-gray-600 hover:bg-gray-700",
    light: active
      ? "bg-yellow-400 text-black border-yellow-400 shadow"
      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100",
  }

  return (
    <button
      onClick={onClick}
      className={twMerge(baseClasses, themeClasses[theme])}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

export default ModesButton
