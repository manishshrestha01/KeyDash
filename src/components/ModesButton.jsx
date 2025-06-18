import React from 'react'

const ModesButton = ({ children, ...props }) => {
  return (
    <button
    className="mt-1 ml-0 px-2 lg:px-5 lg:ml-20 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg py-2.5 text-center mb-2 block text-base cursor-pointer"
    {...props}
    >
      {children}
    </button>
  )
}

export default ModesButton