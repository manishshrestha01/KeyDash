const ForgotPassword = () => {
  return (
<div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-lg space-y-6">
  <h2 className="text-2xl font-semibold text-center text-slate-900">Login / Signup</h2>
  <div>
    <input type="email" placeholder="Email" className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none transition" />
  </div>
  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition">
    Sign In With Email
  </button>
  <div className="flex items-center my-4">
    <div className="flex-grow border-t border-gray-300" />
    <span className="mx-4 text-gray-500">Or continue with</span>
    <div className="flex-grow border-t border-gray-300" />
  </div>
  <button className="w-full flex items-center justify-center border border-gray-300 rounded-lg py-3 hover:bg-gray-100 transition">
    <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png" alt="Google" className="w-5 h-5 mr-3" />
    <span className="text-gray-700 font-medium">Google</span>
  </button>
</div>
  )
}

export default ForgotPassword