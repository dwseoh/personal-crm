"use client";
import { useState } from "react";

interface ProfilesProps {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at?: string;
  current_role?:string;
  company?:string;
  location?:string;
  importance?:number;
  onOpenPanel: (contact: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    notes: string;
    created_at?: string;
    current_role?: string;
    company?: string;
    location?: string;
    importance?: number;
  }) => void;
}

export default function Profiles({id, name, email, phone, notes, current_role, company, location, importance, onOpenPanel}: ProfilesProps) {

  return (
    <>
      {/* Contact card */}
      <button
        onClick={() => onOpenPanel({id, name, email, phone, notes, current_role, company, location, importance})}
        className="w-full p-4 bg-base-100 border border-base-300 text-base-content rounded-xl hover:bg-base-200 hover:border-primary hover:shadow-lg transition-all duration-200 text-left group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-neutral text-neutral-content rounded-full flex items-center justify-center font-semibold text-lg shadow-md">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base-content truncate group-hover:text-neutral transition-colors">
              {name}
            </h3>
            <p className="text-sm text-base-content opacity-60 truncate">{email}</p>
          </div>
        </div>
      </button>
    </>
  );
}
