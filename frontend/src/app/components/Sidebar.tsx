"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/hooks/useAuth";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Try to get username from localStorage
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUsername(storedUsername);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest("#sidebar-toggle")
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mouseup", handleClickOutside);
    return () => {
      document.removeEventListener("mouseup", handleClickOutside);
    };
  }, [sidebarRef]);

  return (
    <>
      {/* Toggle button (fixed top-left corner) */}
      <button
        id="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-7 left-4 z-46 p-3 h-12 w-12 bg-base-200 hover:bg-base-300 text-base-content rounded-lg border border-base-300 transition-colors duration-200"
      >
        {isOpen ? "✖" : "☰"}
      </button>

      {/* Sidebar overlay */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-base-200 border-r border-base-300 text-base-content transition-all duration-300 z-45 shadow-lg ${isOpen ? "w-64" : "w-0"
          } overflow-hidden`}
      >
        <div className="mt-20 flex flex-col space-y-1x p-4">
          {/* User info section */}
          <div className="mb-4 p-3 bg-base-300 rounded-lg border border-base-300">
            <p className="text-sm text-base-content opacity-70">
              Logged in as:
            </p>
            <p className="font-semibold text-base-content">
              {username || "User"}
            </p>
          </div>

          {/* Navigation buttons */}
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push("/contacts")}
            className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content"
          >
            Contacts
          </button>
          <button
            onClick={() => router.push("/interactions")}
            className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content"
          >
            Interactions
          </button>
          <button
            onClick={() => router.push("/groups")}
            className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content"
          >
            Groups
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="px-4 py-3 text-left hover:bg-base-300 rounded-lg transition-colors duration-200 text-base-content"
          >
            Profile
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
            onClick={logout}
            className="px-4 py-3 text-left hover:bg-error hover:text-error-content rounded-lg transition-colors duration-200 text-base-content"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}