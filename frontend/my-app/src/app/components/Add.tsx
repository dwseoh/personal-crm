"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Add() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [success, setSuccess] = useState(false);

  const addContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // ✅ Validation: required fields
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in all fields");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/contacts/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone, notes }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Add contact failed");
      }

      // Success → show verification message
      setSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setIsOpen(false);
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-content hover:bg-opacity-90 rounded-full shadow-lg z-50 flex items-center justify-center transition-all duration-200 hover:scale-105"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div
        className={`fixed inset-0 bg-base-100 bg-opacity-50 flex items-center justify-center z-50 ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <div className="bg-base-100 border border-base-300 p-6 rounded-xl shadow-xl relative w-96 max-w-[90vw]">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-base-content opacity-70 hover:opacity-100 hover:bg-base-200 rounded-full p-1 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Profile content */}
          <h2 className="text-xl font-bold text-base-content mb-6">Add Contact</h2>

          <form
            onSubmit={addContact}
            className="flex flex-col gap-4 items-center text-base-content"
          >
            {/* Name */}
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-base-300 bg-base-200 text-base-content placeholder-base-content placeholder-opacity-70 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Email */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-base-300 bg-base-200 text-base-content placeholder-base-content placeholder-opacity-70 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Phone */}
            <input
              type="text"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border border-base-300 bg-base-200 text-base-content placeholder-base-content placeholder-opacity-70 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border border-base-300 bg-base-200 text-base-content placeholder-base-content placeholder-opacity-70 px-4 py-2 rounded w-full h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary"  
            />

            {/* Error Message */}
            {error && <p className="text-error text-sm">{error}</p>}

            {/* Add Button */}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-content rounded hover:opacity-90 transition-opacity w-full disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Contact"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
