"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-slate-900">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <p className="text-2xl font-bold text-center">PERSONAL CRM</p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link href="/signup">
            <button className="bg-blue-500 text-white px-4.5 py-2 rounded">
              Signup
            </button>
          </Link>
          <Link href="/login">
            <button className="bg-blue-500 text-white px-6 py-2 rounded">
              Login
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
