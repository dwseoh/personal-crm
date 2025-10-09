"use client";
import { useState } from "react";

export default function Add() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-white hover:bg-gray-300 rounded-full text-black z-50"
      >
        Add
      </button>

      <div
        className={`fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <div className="bg-white p-6 w-300 h-150 rounded-xl shadow-lg relative w-80">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-black"
          >
            ✖
          </button>

          {/* Profile content */}
          <h2 className="text-xl font-bold text-black mb-4">Add Contact</h2>
          <p className="text-gray-700">name</p>
        </div>
      </div>
    </>
  );
}
