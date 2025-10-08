"use client";
import { useState } from "react";

interface ProfilesProps {
  name: string;
}

export default function Profiles({name}: ProfilesProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Button to open popup */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 h-55 bg-blue-500 text-white rounded-2xl hover:bg-blue-600"
      >
        {name}
      </button>

      {/* Popup overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-35">
          <div className="bg-white p-6 w-300 h-150 rounded-xl shadow-lg relative w-80">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✖
            </button>

            {/* Profile content */}
            <h2 className="text-xl font-bold text-black mb-4">Profile</h2>
            <p className="text-gray-700">{name}</p>
          </div>
        </div>
      )}
    </>
  );
}
