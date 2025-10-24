"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import ChangeTheme from "./components/ChangeTheme";

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
      <ChangeTheme />

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