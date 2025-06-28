// src/components/LoginForm.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../supabaseClient";

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // const redirectUrl = "https://keydash.shresthamanish.info.np/";
  const redirectUrl = "http://localhost:5173/";


  const onSubmit = async (data) => {
    setMessage("");
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      setError("Failed to send login link. Please try again.");
      console.error("Magic link error:", error);
    } else {
      setMessage(`A magic login link has been sent to your email (${data.email})`);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage("");
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      setError("Google login failed. Please try again.");
      console.error("Google OAuth error:", error);
    }
  };

  return (
    <div className="bg-dark-gray flex justify-center pt-12">
      <div className="max-w-[480px] w-full p-4">
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm relative">
          <a
            href="/"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </a>

          <h1 className="text-slate-900 text-center text-3xl font-semibold mb-6">
            Login / Sign Up
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-slate-900 text-base font-medium mb-2 block">
                Email
              </label>
              <input
                name="email"
                type="email"
                {...register("email", { required: "This field is required" })}
                className="w-full text-slate-900 text-lg border border-gray-400 px-4 py-3 rounded-md outline-blue-600"
                placeholder="Enter Email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {message && (
              <p className="text-green-600 text-sm text-center">{message}</p>
            )}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition cursor-pointer"
            >
              Continue with Email
            </button>

            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-400" />
              <span className="mx-4 text-black">Or continue with</span>
              <div className="flex-grow border-t border-gray-400" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center border border-gray-300 rounded-lg py-3 hover:bg-gray-100 transition cursor-pointer"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5 mr-3"
              />
              <span className="text-black font-medium">Google</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
