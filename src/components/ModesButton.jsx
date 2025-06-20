import React from 'react'

const ModesButton = ({ children, ...props }) => {
  return (
    <button
    className="mt-8 ml-23 px-2 text-center mb-2 block text-base lg:px-5 lg:ml-20 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg py-2.5 cursor-pointer"
    {...props}
    >
      {children}
    </button>
  )
}

export default ModesButton