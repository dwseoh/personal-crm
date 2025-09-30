"use client";
import Profiles from "../components/Profiles";
import Sidebar from "../components/Sidebar";

import { useRouter } from "next/navigation";

export default function Dashboard() {
    const router = useRouter();
    const buttonTexts = ["Gabriel Yu", "Jamie Seoh", "Charlie Kirk", "Paul Ward", "Trump", "Obama", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    return(
      <main className="relative min-h-screen p-8 bg-slate-900">
      <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold"
      >
        Welcome</h1>
      <p className="absolute left-1/2 -translate-x-1/2 translate-y-10">DASHBOARD</p>

      {/* Button in bottom-right */}
      <button
        className="fixed bottom-4 right-4 px-4 py-2 bg-white rounded-full text-black w-30 z-40"
      >
        Add
      </button>
      <Sidebar />
       <div className="grid grid-cols-5 gap-4 p-10 translate-y-15">
      {buttonTexts.map((text, index) => (
        <Profiles key={index} name={text} onClick={() => alert(text)} />
      ))}
    </div>
    </main>
    );
}