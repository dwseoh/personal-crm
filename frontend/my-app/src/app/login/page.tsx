"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
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
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await res.json();
      console.log("Login successful:", data);

      // Save token if needed
      localStorage.setItem("token", data.access_token);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="flex flex-col items-center bg-slate-900 justify-center min-h-screen gap-6">
      <h1 className="text-2xl font-bold text-white">Login</h1>

      {/* Username */}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
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

      {/* Error message */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Login button */}
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-64"
      >
        Login
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
