import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../supabaseClient";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  CheckCircle, AlertCircle, ArrowLeft, KeyRound,
} from "lucide-react";

// ─── OTP input: 6 individual boxes ───────────────────────────────────────────
const OtpInput = ({ value, onChange }) => {
  const inputs = useRef([]);
  const digits = (value || "").split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (e, i) => {
    if (e.key === "Backspace") {
      const next = digits.map((d, idx) => (idx === i ? "" : d)).join("");
      onChange(next);
      if (i > 0) inputs.current[i - 1]?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = digits.map((d, idx) => (idx === i ? e.key : d)).join("");
    onChange(next);
    if (i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    inputs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={() => {}} // controlled via onKeyDown
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-bold text-white bg-[#0f1219] border border-gray-700 rounded-xl focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition"
        />
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const LoginFormV2 = () => {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp, 3=new-password
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showNewPwConfirm, setShowNewPwConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();
  const passwordValue = watch("password");

  const allowedRedirectUrls = [
    "https://keydash.shresthamanish.info.np/",
    "https://v2.shresthamanish.info.np/",
    "http://localhost:5173/",
  ];
  const currentAppUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "";
  const redirectUrl = allowedRedirectUrls.includes(currentAppUrl)
    ? currentAppUrl
    : allowedRedirectUrls[0];

  const switchMode = (newMode) => {
    setMode(newMode);
    setForgotStep(1);
    setForgotEmail("");
    setOtp("");
    setMessage("");
    setError("");
    reset();
  };

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (data) => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: data.forgotEmail,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setForgotEmail(data.forgotEmail);
      setForgotStep(2);
      setOtp("");
    }
  };

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: forgotEmail,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Invalid or expired code. Please try again.");
    } else {
      setForgotStep(3);
    }
  };

  // ── Step 3: set new password ────────────────────────────────────────────────
  const handleSetPassword = async (data) => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage("Password updated! Signing you in…");
      setTimeout(() => navigate("/"), 1500);
    }
  };

  // ── Login / Register ────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setMessage("");
    setError("");
    setLoading(true);

    if (mode === "register") {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) { setLoading(false); setError(error.message); return; }

      const newUser = signUpData?.user;
      if (newUser) {
        await supabase.from("profiles").upsert({
          id: newUser.id,
          email: data.email,
          display_name: data.email.split("@")[0],
          avatar_url: null,
          created_at: new Date().toISOString(),
        });
      }
      setLoading(false);
      navigate("/");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      setLoading(false);
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password."
            : error.message
        );
      } else {
        navigate("/");
      }
    }
  };

  const handleGoogleLogin = async () => {
    setMessage(""); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
    if (error) { setError("Google login failed. Please try again."); }
  };

  // ── Subtitle ────────────────────────────────────────────────────────────────
  const subtitle = {
    login: "Sign in to track your typing progress",
    register: "Create your account to get started",
    forgot: [
      "Enter your email to receive a verification code",
      `We sent a 6-digit code to ${forgotEmail}`,
      "Almost there — set your new password",
    ][forgotStep - 1],
  }[mode];

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const Feedback = ({ msg, isError }) =>
    msg ? (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-4 flex items-start gap-3 ${
          isError
            ? "bg-red-500/10 border border-red-500/30"
            : "bg-green-500/10 border border-green-500/30"
        }`}
      >
        {isError
          ? <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          : <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
        <p className={`text-sm ${isError ? "text-red-400" : "text-green-400"}`}>{msg}</p>
      </motion.div>
    ) : null;

  const SubmitBtn = ({ label, loadingLabel }) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {loading ? (
        <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />{loadingLabel}</>
      ) : (
        <>{label}<ArrowRight className="w-5 h-5" /></>
      )}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 bg-[#0a0f1a]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to KeyDash</h1>
          <p className="text-gray-400">{subtitle}</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-8 border border-gray-800/50 shadow-2xl"
        >
          {/* ── Forgot flow ─────────────────────────────────────────────────── */}
          {mode === "forgot" ? (
            <>
              {/* Back button */}
              <button
                type="button"
                onClick={forgotStep === 1 ? () => switchMode("login") : () => { setForgotStep(s => s - 1); setError(""); setMessage(""); }}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {forgotStep === 1 ? "Back to Sign In" : "Back"}
              </button>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      forgotStep > s ? "bg-yellow-400 text-black" :
                      forgotStep === s ? "bg-yellow-400/20 border border-yellow-400 text-yellow-400" :
                      "bg-gray-800 text-gray-500"
                    }`}>
                      {forgotStep > s ? <CheckCircle className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && <div className={`flex-1 h-px transition-all ${forgotStep > s ? "bg-yellow-400" : "bg-gray-700"}`} />}
                  </React.Fragment>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1 – Email */}
                {forgotStep === 1 && (
                  <motion.form
                    key="step1"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSubmit(handleSendOtp)}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-gray-400 text-sm font-medium mb-2 block">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type="email"
                          {...register("forgotEmail", {
                            required: "Email is required",
                            pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" },
                          })}
                          className="w-full bg-[#0f1219] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                          placeholder="you@example.com"
                        />
                      </div>
                      {errors.forgotEmail && (
                        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{errors.forgotEmail.message}
                        </p>
                      )}
                    </div>
                    <Feedback msg={error} isError />
                    <SubmitBtn label="Send Code" loadingLabel="Sending…" />
                  </motion.form>
                )}

                {/* Step 2 – OTP */}
                {forgotStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <p className="text-gray-400 text-sm text-center">
                      Enter the 6-digit code sent to <span className="text-white font-medium">{forgotEmail}</span>
                    </p>
                    <OtpInput value={otp} onChange={setOtp} />
                    <Feedback msg={error} isError />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.replace(/\s/g, "").length < 6}
                      className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {loading ? (
                        <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Verifying…</>
                      ) : (
                        <>Verify Code<ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>
                    <p className="text-center text-sm text-gray-500">
                      Didn't get it?{" "}
                      <button
                        type="button"
                        onClick={() => { setForgotStep(1); setOtp(""); setError(""); }}
                        className="text-yellow-400 hover:underline"
                      >
                        Resend code
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* Step 3 – New password */}
                {forgotStep === 3 && (
                  <motion.form
                    key="step3"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSubmit(handleSetPassword)}
                    className="space-y-4"
                  >
                    {/* New password */}
                    <div>
                      <label className="text-gray-400 text-sm font-medium mb-2 block">New Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type={showNewPw ? "text" : "password"}
                          {...register("newPassword", {
                            required: "Password is required",
                            minLength: { value: 6, message: "Minimum 6 characters" },
                          })}
                          className="w-full bg-[#0f1219] text-white pl-12 pr-12 py-4 rounded-xl border border-gray-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowNewPw(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors">
                          {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.newPassword && (
                        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{errors.newPassword.message}
                        </p>
                      )}
                    </div>

                    {/* Confirm new password */}
                    <div>
                      <label className="text-gray-400 text-sm font-medium mb-2 block">Confirm Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type={showNewPwConfirm ? "text" : "password"}
                          {...register("newPasswordConfirm", {
                            required: "Please confirm your password",
                            validate: (v) => v === watch("newPassword") || "Passwords do not match",
                          })}
                          className="w-full bg-[#0f1219] text-white pl-12 pr-12 py-4 rounded-xl border border-gray-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowNewPwConfirm(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                          {showNewPwConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.newPasswordConfirm && (
                        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{errors.newPasswordConfirm.message}
                        </p>
                      )}
                    </div>

                    <Feedback msg={error} isError />
                    <Feedback msg={message} />
                    <SubmitBtn label="Update Password" loadingLabel="Updating…" />
                  </motion.form>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* ── Login / Register flow ───────────────────────────────────── */
            <>
              {/* Toggle */}
              <div className="flex bg-[#0f1219] rounded-xl p-1 mb-6">
                {["login", "register"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      mode === m ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {m === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-gray-500 text-sm">or with email</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              {/* Email / password form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-gray-400 text-sm font-medium mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      {...register("email", {
                        required: "Email is required",
                        pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" },
                      })}
                      className="w-full bg-[#0f1219] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                      placeholder="you@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />{errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-400 text-sm font-medium">Password</label>
                    {mode === "login" && (
                      <button type="button" onClick={() => switchMode("forgot")}
                        className="text-yellow-400 text-sm hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("password", {
                        required: "Password is required",
                        minLength: { value: 6, message: "Password must be at least 6 characters" },
                      })}
                      className="w-full bg-[#0f1219] text-white pl-12 pr-12 py-4 rounded-xl border border-gray-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />{errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm password (register only) */}
                <AnimatePresence>
                  {mode === "register" && (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label className="text-gray-400 text-sm font-medium mb-2 block">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type={showConfirm ? "text" : "password"}
                          {...register("confirmPassword", {
                            required: "Please confirm your password",
                            validate: (v) => v === passwordValue || "Passwords do not match",
                          })}
                          className="w-full bg-[#0f1219] text-white pl-12 pr-12 py-4 rounded-xl border border-gray-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors">
                          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />{errors.confirmPassword.message}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Feedback msg={message} />
                <Feedback msg={error} isError />

                <SubmitBtn
                  label={mode === "login" ? "Sign In" : "Create Account"}
                  loadingLabel={mode === "login" ? "Signing in…" : "Creating account…"}
                />
              </form>

              {/* Switch mode */}
              <p className="text-gray-500 text-sm text-center mt-5">
                {mode === "login" ? (
                  <>Don't have an account?{" "}
                    <button type="button" onClick={() => switchMode("register")}
                      className="text-yellow-400 hover:underline font-medium">Register</button></>
                ) : (
                  <>Already have an account?{" "}
                    <button type="button" onClick={() => switchMode("login")}
                      className="text-yellow-400 hover:underline font-medium">Sign In</button></>
                )}
              </p>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-gray-500 text-sm text-center mt-6"
        >
          By continuing, you agree to our{" "}
          <a href="/terms-of-service" className="text-yellow-400 hover:underline">Terms of Service</a>{" "}
          and{" "}
          <a href="/privacy-policy" className="text-yellow-400 hover:underline">Privacy Policy</a>
        </motion.p>
      </div>
    </div>
  );
};

export default LoginFormV2;
