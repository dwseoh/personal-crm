"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ResendVerification from "../components/ResendVerification";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const searchParams = useSearchParams();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // User is already logged in → redirect to dashboard
      router.push("/dashboard");
    }

    // Check if user came from email verification
    const verified = searchParams.get("verified");
    if (verified === "true") {
      setVerificationSuccess(true);
      // Clear the URL parameter after showing the message
      setTimeout(() => setVerificationSuccess(false), 5000);
    }
  }, [router, searchParams]);
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation: require both fields
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: username, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        //router.push("/dashboard"); // **REMOVE THIS LATER**
        throw new Error(errorData.detail || "Login failed");
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", username);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="flex flex-col items-center bg-base-100 justify-center min-h-screen gap-6">
      <h1 className="text-2xl font-bold text-base-content">Login</h1>

      {/* Verification Success Message */}
      {verificationSuccess && (
        <div className="bg-success text-success-content px-6 py-4 rounded-lg w-80 text-center shadow-lg border border-success">
          <div className="flex items-center justify-center mb-2">
            <svg
              className="h-6 w-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            <p className="font-bold">Email Verified Successfully!</p>
          </div>
          <p className="text-sm opacity-90">
            Your account is now active. Please log in below.
          </p>
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4 items-center">
        {/* Username */}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-base-300 bg-base-200 text-base-content px-4 py-2 rounded w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Password */}
        <div className="relative w-64">
          <input
            type={showPassword ? "text" : "password"} // ✅ toggle type
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-base-300 bg-base-200 text-base-content px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {/* Show/Hide toggle */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-sm text-base-content opacity-70 hover:opacity-100"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Error message */}
        {error && <p className="text-error">{error}</p>}

        {/* Login button */}
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-content rounded hover:opacity-90 transition-opacity w-64"
        >
          Login
        </button>
      </form>

      {/* Resend Verification */}
      <ResendVerification />

      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="px-4 py-2 bg-base-300 text-base-content rounded hover:bg-base-200 transition-colors w-64"
      >
        ← Back to Home
      </button>
    </main>
  );
}
