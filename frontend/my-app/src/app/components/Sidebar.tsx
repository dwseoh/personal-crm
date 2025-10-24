"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const handleLogout = () => {
    // Remove token
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user_id");

    // Redirect to login or home
    router.push("/login");
  };
  const [username, setUsername] = useState<string | null>(null);
  const [uuid, setUuid] = useState<string | null>(null);
  useEffect(() => {
    // Try to get username from localStorage
    const storedUsername = localStorage.getItem("username");
    const uuid = localStorage.getItem("user_id");
    if (storedUsername) setUsername(storedUsername);
    if (uuid) setUuid(uuid);
  }, []);

  return (
    <>
      {/* Toggle button (fixed top-left corner) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-base-300 text-base-content rounded cursor-pointer"
      >
        {isOpen ? "✖" : "☰"}
      </button>

      {/* Sidebar overlay */}
      <div
        className={`fixed top-0 left-0 h-full bg-base-300 text-base-content transition-all duration-300 z-40 ${
          isOpen ? "w-64" : "w-0"
        } overflow-hidden`}
      >
        <div className="mt-16 flex flex-col space-y-2 p-4">
          <button className="px-4 py-2 text-left rounded">
            Dashboard
          </button>
          <button 
            onClick={() => router.push("/profile")}
            className="px-4 py-2 text-left hover:bg-gray-700 rounded cursor-pointer">
            Profile
          </button>
          <button 
          onClick={() => router.push("/settings")}
          className="px-4 py-2 text-left hover:bg-gray-700 rounded cursor-pointer">
            Settings
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-left hover:bg-gray-700 rounded cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-left hover:bg-gray-700 rounded cursor-pointer"
          >
            Logout
          </button>
          <p className="px-4 py-10 text-left text-white">{username}</p>

        </div>
      </div>
    </>
  );
}
