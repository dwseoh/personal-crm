"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  
  useEffect(() => {
    // Try to get username from localStorage
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUsername(storedUsername);
  }, []);

  return (
    <>
      {/* Toggle button (fixed top-left corner) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 p-3 h-12 w-12 bg-base-200 hover:bg-base-300 text-base-content rounded-lg border border-base-300 transition-colors duration-200"
      >
        {isOpen ? "✖" : "☰"}
      </button>

      {/* Sidebar overlay */}
      <div
        className={`fixed top-0 left-0 h-full bg-base-200 border-r border-base-300 text-base-content transition-all duration-300 z-30 shadow-lg ${
          isOpen ? "w-64" : "w-0"
        } overflow-hidden`}
      >
        <div className="mt-16 flex flex-col space-y-1 p-4">
          {/* User info section */}
          <div className="mb-4 p-3 bg-base-300 rounded-lg border border-base-300">
            <p className="text-sm text-base-content opacity-70">Logged in as:</p>
            <p className="font-semibold text-base-content">{username || 'User'}</p>
          </div>

          {/* Navigation buttons */}
          <button 
          onClick ={() => router.push("/dashboard")}  
          className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content">
            Dashboard
          </button>
          <button 
          onClick ={() => router.push("/profile")}
          className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content">
            Profile
          </button>
          <button 
          onClick ={() => router.push("/settings")}
          className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content">
            Settings
          </button>
          
          {/* Divider */}
          <div className="border-t border-base-300 my-2"></div>
          
          <button
            onClick={() => router.push("/")}
            className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content"
          >
            Home
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-3 text-left hover:bg-error hover:text-error-content rounded-lg transition-colors duration-200 text-base-content"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
