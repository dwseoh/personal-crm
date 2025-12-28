"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PriorityContact } from "@/types/interactions";

interface PriorityContactsPanelProps {
    userId?: string;
    limit?: number;
}

const MODE_OPTIONS = [
    { value: "default", label: "Default", description: "Balanced priority" },
    { value: "career", label: "Career", description: "Professional focus" },
    { value: "social", label: "Social", description: "Personal connections" },
];

export default function PriorityContactsPanel({
    userId,
    limit = 10,
}: PriorityContactsPanelProps) {
    const router = useRouter();
    const [priorityContacts, setPriorityContacts] = useState<PriorityContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMode, setSelectedMode] = useState("default");

    useEffect(() => {
        loadPriorityContacts();
    }, [selectedMode]);

    const loadPriorityContacts = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setIsLoading(true);

        try {
            const res = await fetch(
                `http://127.0.0.1:8000/analytics/priority-contacts?mode=${selectedMode}&limit=${limit}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.ok) {
                const data = await res.json();
                setPriorityContacts(data);
            } else {
                console.error("Failed to load priority contacts");
            }
        } catch (error) {
            console.error("Failed to load priority contacts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleContactClick = (contactId: string) => {
        router.push(`/interactions?contactId=${contactId}`);
    };

    return (
        <div className="bg-base-200 border border-base-300 rounded-lg p-6">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-base-content mb-1">Reach Out Next</h2>
                <p className="text-sm text-base-content opacity-70">
                    Contacts prioritized by interaction patterns
                </p>
            </div>

            {/* Mode selector */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                    Priority Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {MODE_OPTIONS.map((mode) => (
                        <button
                            key={mode.value}
                            onClick={() => setSelectedMode(mode.value)}
                            className={`p-2 rounded-lg border-2 transition-all text-center ${selectedMode === mode.value
                                    ? "border-primary bg-primary bg-opacity-10"
                                    : "border-base-300 hover:border-base-content hover:border-opacity-30"
                                }`}
                            title={mode.description}
                        >
                            <div className="text-sm font-medium text-base-content">{mode.label}</div>
                            <div className="text-xs text-base-content opacity-70">{mode.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Priority contacts list */}
            {isLoading ? (
                <div className="text-center py-8 text-base-content opacity-70">
                    <p className="text-sm">Loading priority contacts...</p>
                </div>
            ) : priorityContacts.length === 0 ? (
                <div className="text-center py-8 text-base-content opacity-70">
                    <p className="text-sm">No contacts with interactions yet</p>
                    <p className="text-xs mt-1">Add interactions to see priority recommendations</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {priorityContacts.map((contact, index) => (
                        <button
                            key={contact.contact_id}
                            onClick={() => handleContactClick(contact.contact_id)}
                            className="w-full p-3 bg-base-100 border border-base-300 rounded-lg hover:border-primary transition-colors text-left"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-base-content opacity-70">
                                            #{index + 1}
                                        </span>
                                        <span className="font-semibold text-base-content truncate">
                                            {contact.contact_name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-base-content opacity-70 mt-1">
                                        {contact.explanation}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-base-content opacity-60">
                                        <span>{contact.days_since_last}d ago</span>
                                        <span>•</span>
                                        <span>{contact.total_interactions_30d} in 30d</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-primary">
                                            {contact.score}
                                        </div>
                                        <div className="text-xs text-base-content opacity-70">score</div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
