"use client";
import { useState } from "react";

interface ProfilesProps {
  id?: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  onOpenPanel: (contact: {id?: number, name: string, email: string, phone: string, notes: string}) => void;
}

export default function Profiles({id, name, email, phone, notes, onOpenPanel}: ProfilesProps) {

  return (
    <>
      {/* Contact card */}
      <button
        onClick={() => onOpenPanel({id, name, email, phone, notes})}
        className="w-full p-4 bg-base-200 border border-base-300 text-base-content rounded-lg hover:bg-base-300 hover:border-primary transition-all duration-200 text-left group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary text-primary-content rounded-full flex items-center justify-center font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base-content truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-base-content opacity-70 truncate">{email}</p>
          </div>
        </div>
      </button>
    </>
  );
}
