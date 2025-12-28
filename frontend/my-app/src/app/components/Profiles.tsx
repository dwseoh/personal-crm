"use client";
import { useState } from "react";

interface ProfilesProps {
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

export default function Profiles({ id, name, email, phone, notes, current_role, company, location, importance, onOpenPanel }: ProfilesProps) {

  return (
    <>
      {/* Contact card */}
      <button
        onClick={() => onOpenPanel({ id, name, email, phone, notes, current_role, company, location, importance })}
        className="w-full p-4 bg-base-100 border border-base-300 text-base-content rounded-xl hover:bg-base-200 hover:border-primary hover:shadow-lg transition-all duration-200 text-left group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-neutral text-neutral-content rounded-full flex items-center justify-center font-semibold text-lg shadow-md">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base-content truncate group-hover:text-neutral transition-colors">
                {name}
              </h3>
              {/* Importance stars */}
              {importance && importance >= 3 && (
                <div className="flex items-center flex-shrink-0">
                  {[...Array(importance)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-3 h-3 text-warning fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-base-content opacity-60 truncate">{email}</p>
          </div>
        </div>
      </button>
    </>
  );
}
