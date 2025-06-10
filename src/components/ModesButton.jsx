import React from 'react'

const ModesButton = ({ children, ...props }) => {
  return (
    <button
      className='m-4 p-2 border-amber-400 rounded bg-gray-100 hover:bg-gray-200'
      {...props}
    >
      {children}
    </button>
  )
}

export default ModesButton