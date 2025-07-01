import React from "react"
import { twMerge } from "tailwind-merge"

const ModesButton = ({ children, onClick, active, icon, theme = "dark" }) => {
  const baseClasses = `
    flex items-center gap-1 sm:gap-2 
    px-3 py-1.5 sm:px-4 sm:py-2 
    rounded-full 
    text-base sm:text-lg md:text-xl 
    font-semibold 
    transition-all 
    border
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
