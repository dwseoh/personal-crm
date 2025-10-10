"use client";
import { useState } from "react";
import {useRouter} from "next/navigation";

export default function Add() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null; 
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
        body: JSON.stringify({ name, email, phone, notes}),
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

          <form
            onSubmit={addContact}
            className="flex flex-col gap-4 items-center"
          >
            {/* Name */}
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border text-black placeholder-black px-4 py-2 rounded w-64"
            />

            {/* Email */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border text-black placeholder-black px-4 py-2 rounded w-64"
            />

            {/* Password */}
            <input
              type="text"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border text-black placeholder-black px-4 py-2 rounded w-64"
            />

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border text-black placeholder-black px-4 py-2 rounded w-64 h-24"  
            />


            {/* Error Message */}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-64 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Contact"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
