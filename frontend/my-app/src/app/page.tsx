"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import Link from "next/link";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="font-sans min-h-screen bg-base-100 relative">
      {/* Theme toggle button in top-right corner */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-3 rounded-lg bg-base-200 hover:bg-base-300 text-base-content transition-all duration-200 border border-base-300"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>

      {/* Main content centered */}
      <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[32px] items-center sm:items-start">
          <p className="text-2xl font-bold text-center text-base-content">
            PERSONAL CRM
          </p>

          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <Link href="/signup">
              <button className="bg-base-300 text-base-content px-4 py-2 rounded">
                Signup
              </button>
            </Link>
            <Link href="/login">
              <button className="bg-base-300 text-base-content px-6 py-2 rounded">
                Login
              </button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}