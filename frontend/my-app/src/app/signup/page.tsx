"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setError(null);

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

      // Success → go to login
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col bg-slate-900 items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold text-white">Signup</h1>

      {/* Name */}
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-4 py-2 rounded w-64"
      />

      {/* Email */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border px-4 py-2 rounded w-64"
      />

      {/* Password */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border px-4 py-2 rounded w-64"
      />

      {/* Error Message */}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Signup Button */}
      <button
        onClick={handleSignup}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-64"
      >
        {loading ? "Signing up..." : "Signup"}
      </button>

      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-zinc-800 w-64"
      >
        ← Back to Home
      </button>
    </main>
  );
}
