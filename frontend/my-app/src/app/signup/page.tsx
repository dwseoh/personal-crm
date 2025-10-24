"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // ✅ Validation: required fields
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields");
      return;
    }

    // ✅ Validation: password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Signup failed");
      }

      // Success → show verification message
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex flex-col bg-base-100 items-center justify-center min-h-screen gap-4">
        <div className="bg-base-200 border border-base-300 rounded-lg p-8 max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success mb-4">
            <svg className="h-6 w-6 text-success-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-base-content mb-4">Check Your Email!</h2>
          <p className="text-base-content opacity-80 mb-6">
            We've sent a verification link to <strong>{email}</strong>. 
            Please check your inbox and click the link to verify your account.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full px-4 py-2 bg-primary text-primary-content rounded hover:opacity-90 transition-opacity"
            >
              Go to Login
            </button>
            <button
              onClick={() => setSuccess(false)}
              className="w-full px-4 py-2 bg-base-300 text-base-content rounded hover:bg-base-200 transition-colors"
            >
              Back to Signup
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-base-100 items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold text-base-content">Signup</h1>

      <form onSubmit={handleSignup} className="flex flex-col gap-4 items-center">
        {/* Name */}
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-base-300 bg-base-200 text-base-content px-4 py-2 rounded w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-base-300 bg-base-200 text-base-content px-4 py-2 rounded w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-base-300 bg-base-200 text-base-content px-4 py-2 rounded w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Confirm Password */}
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="border border-base-300 bg-base-200 text-base-content px-4 py-2 rounded w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Error Message */}
        {error && <p className="text-error text-sm">{error}</p>}

        {/* Signup Button */}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-content rounded hover:opacity-90 transition-opacity w-64 disabled:opacity-50"
        >
          {loading ? "Signing up..." : "Signup"}
        </button>
      </form>

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
