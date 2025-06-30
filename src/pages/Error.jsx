import React from 'react'

const Error = () => {
  return (
    <section class="bg-white dark:bg-gray-900">
    <div class="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
        <div class="mx-auto max-w-screen-sm text-center">
            <h1 class="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600 text-[#3b82f5]">404</h1>
            <p class="mb-4 text-7xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">Something's missing.</p>
            <p class="mb-4 text-3xl font-light text-gray-500 dark:text-gray-400">Sorry, we can't find that page. You'll find lots to explore on the home page. </p>
            <a href="/" class="inline-flex text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-2xl px-5 py-2.5 text-center my-4">Back to Homepage</a>
        </div>   
    </div>
</section>
  )
}

export default Error