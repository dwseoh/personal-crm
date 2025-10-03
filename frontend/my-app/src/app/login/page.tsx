"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ✅ show/hide state
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // User is already logged in → redirect to dashboard
      router.push("/dashboard");
    }
  }, [router]);
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
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="flex flex-col items-center bg-slate-900 justify-center min-h-screen gap-6">
      <h1 className="text-2xl font-bold text-white">Login</h1>

      <form onSubmit={handleLogin} className="flex flex-col gap-4 items-center">
        {/* Username */}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border px-4 py-2 rounded w-64"
        />

        {/* Password */}
        <div className="relative w-64">
          <input
            type={showPassword ? "text" : "password"} // ✅ toggle type
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border px-4 py-2 rounded w-full"
          />
          {/* Show/Hide toggle */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-sm text-gray-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Error message */}
        {error && <p className="text-red-500">{error}</p>}

        {/* Login button */}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-64"
        >
          Login
        </button>
      </form>

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
