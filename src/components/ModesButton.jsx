import React from 'react'

const ModesButton = ({ children, active, ...props }) => {
  return (
    <button
      className={`px-5 py-2.5 text-base font-semibold rounded-lg cursor-pointer 
        ${active ? "bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

export default ModesButton
