import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Lock, Mail, User, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated, loading, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs font-mono">
        Authenticating session...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      const errMsg = err.message || err.data?.error?.message || err.response?.data?.error?.message || "Registration failed. Please check your information.";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setIsSubmitting(true);
    try {
      if (!credentialResponse?.credential) {
        throw new Error("No Google credential received.");
      }
      await loginWithGoogle(credentialResponse.credential);
      navigate("/dashboard");
    } catch (err) {
      const errMsg = err.message || err.data?.error?.message || err.response?.data?.error?.message || "Google Authentication failed.";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-cyan-950/40 relative z-10 backdrop-blur-xl">
        
        {/* Header */}
        <div className="text-center mb-6 space-y-3">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
            </div>
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight">Create User Account</h2>
          <p className="text-xs text-slate-400">Register with Google or Email for secure document sharing</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Signup Option */}
        <div className="mb-6 space-y-3">
          {GOOGLE_CLIENT_ID ? (
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Sign-In was cancelled or failed.")}
                theme="filled_black"
                shape="pill"
                size="large"
                width="100%"
                text="signup_with"
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-amber-400/90 text-xs text-center">
              Google Auth active: Add <code className="text-cyan-300 font-mono">VITE_GOOGLE_CLIENT_ID</code> to your <code className="font-mono">.env</code> file.
            </div>
          )}

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-mono uppercase tracking-wider absolute">
              or register with email
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Alice Smith"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@university.edu"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
            />

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="flex gap-1 h-1.5">
                  <div className={`flex-1 rounded-full ${strength >= 1 ? "bg-rose-500" : "bg-slate-800"}`} />
                  <div className={`flex-1 rounded-full ${strength >= 2 ? "bg-amber-500" : "bg-slate-800"}`} />
                  <div className={`flex-1 rounded-full ${strength >= 3 ? "bg-blue-500" : "bg-slate-800"}`} />
                  <div className={`flex-1 rounded-full ${strength >= 4 ? "bg-emerald-500" : "bg-slate-800"}`} />
                </div>
                <p className="text-[10px] text-slate-400 text-right">
                  Strength: {["Weak", "Fair", "Good", "Strong"][strength - 1] || "Weak"}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-6">
          <span>Already registered? </span>
          <Link to="/login" className="text-cyan-400 font-semibold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};
