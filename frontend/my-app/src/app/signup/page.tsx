"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignunPage() {
  const router = useRouter();

  return (
    <main className="flex flex-col bg-slate-900 items-center justify-center min-h-screen gap-6">
      <h1 className="text-2xl font-bold">Signup</h1>

      {/* Username */}
      <input
        type="text"
        placeholder="Username"
        className="border px-4 py-2 rounded"
      />

      {/* Password */}
      <input
        type="password"
        placeholder="Password"
        className="border px-4 py-2 rounded"
      />

      {/* Login button */}
        <Link href="/login">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Signup
            </button>
        </Link>

      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-zinc-800"
      >
        ← Back to Home
      </button>
    </main>
  );
}
