"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PriorityContact } from "@/types/interactions";

interface PriorityContactsPanelProps {
    priorityContacts?: PriorityContact[];
    isLoading?: boolean;
    onModeChange?: (mode: string) => void;
    selectedMode?: string;
}

const MODE_OPTIONS = [
    { value: "default", label: "Default", description: "Balanced priority" },
    { value: "career", label: "Career", description: "Professional focus" },
    { value: "social", label: "Social", description: "Personal connections" },
];

export default function PriorityContactsPanel({
    priorityContacts = [],
    isLoading = false,
    onModeChange,
    selectedMode = "default",
}: PriorityContactsPanelProps) {
    const router = useRouter();

    const handleModeChange = (mode: string) => {
        if (onModeChange) {
            onModeChange(mode);
        }
    };

    return (
        <div className="bg-base-200 border border-base-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-base-content">Priority Contacts</h2>

                {/* Mode selector */}
                <div className="flex gap-2">
                    {MODE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleModeChange(option.value)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedMode === option.value
                                ? "bg-primary text-primary-content"
                                : "bg-base-300 text-base-content hover:bg-base-100"
                                }`}
                            title={option.description}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-base-100 rounded-lg">
                            <div className="w-10 h-10 bg-base-300 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-base-300 rounded w-1/3" />
                                <div className="h-3 bg-base-300 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : priorityContacts.length === 0 ? (
                <div className="text-center py-8 text-base-content opacity-70">
                    <p className="text-sm">No priority contacts found</p>
                    <p className="text-xs mt-1">Add interactions to see priority rankings</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {priorityContacts.map((contact, index) => (
                        <div
                            key={contact.contact_id}
                            className="flex items-center justify-between p-3 bg-base-100 hover:bg-base-300 rounded-lg cursor-pointer transition-colors"
                            onClick={() => router.push(`/contacts`)}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Rank badge */}
                                <div className="w-8 h-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                                </div>

                                {/* Contact info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-base-content truncate">
                                        {contact.contact_name}
                                    </p>
                                    <p className="text-xs text-base-content opacity-70 truncate">
                                        {contact.explanation}
                                    </p>
                                </div>
                            </div>

                            {/* Score */}
                            <div className="flex-shrink-0 ml-3">
                                <div className="text-right">
                                    <div className="text-sm font-bold text-primary">
                                        {contact.score}
                                    </div>
                                    <div className="text-xs text-base-content opacity-60">
                                        score
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
