import React from 'react'

const Error = () => {
  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
        <div className="mx-auto max-w-xs sm:max-w-md md:max-w-lg lg:max-w-screen-sm text-center">
          <h1 className="mb-4 text-6xl sm:text-7xl md:text-6xl lg:text-7xl xl:text-9xl 2xl:text-[13rem] tracking-tight font-extrabold text-primary-600 text-[#3b82f5]">404</h1>
          <p className="mb-4 text-2xl sm:text-4xl md:text-3xl lg:text-3xl xl:text-4xl 2xl:text-9xl tracking-tight font-bold text-gray-900 dark:text-white">Something's missing.</p>
          <p className="mb-4 text-base sm:text-lg md:text-lg lg:text-2xl xl:text-3xl 2xl:text-5xl font-light text-gray-500 dark:text-gray-400">Sorry, we can't find that page. You'll find lots to explore on the home page. </p>
          <a href="/" className="inline-flex text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-base sm:text-lg md:text-lg lg:text-xl xl:text-2xl 2xl:text-4xl px-4 sm:px-5 md:px-5 py-2 sm:py-2.5 md:py-2.5 xl:px-5 xl:py-2.5 2xl:px-10 2xl:py-5 text-center my-4">Back to Homepage</a>
        </div>   
      </div>
    </section>
  )
}

export default Error