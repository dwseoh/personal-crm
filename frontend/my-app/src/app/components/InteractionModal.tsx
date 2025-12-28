"use client";
import { useState, useEffect } from "react";

interface Interaction {
    id?: string;
    contact_id: string;
    type: "email" | "call" | "dm" | "meet" | "other";
    direction: "inbound" | "outbound";
    happened_at: string;
    notes?: string;
}

interface InteractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (interaction: Omit<Interaction, "id">) => Promise<void>;
    contactId: string;
    contactName?: string;
    editingInteraction?: Interaction | null;
}

const TYPE_OPTIONS = [
    { value: "email", label: "📧 Email", icon: "📧" },
    { value: "call", label: "📞 Call", icon: "📞" },
    { value: "dm", label: "💬 Direct Message", icon: "💬" },
    { value: "meet", label: "🤝 Meeting", icon: "🤝" },
    { value: "other", label: "⭐ Other", icon: "⭐" },
];

export default function InteractionModal({
    isOpen,
    onClose,
    onSave,
    contactId,
    contactName,
    editingInteraction,
}: InteractionModalProps) {
    const [type, setType] = useState<Interaction["type"]>("email");
    const [direction, setDirection] = useState<Interaction["direction"]>("outbound");
    const [happenedAt, setHappenedAt] = useState("");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Initialize form when editing
    useEffect(() => {
        if (editingInteraction) {
            setType(editingInteraction.type);
            setDirection(editingInteraction.direction);
            // Convert ISO string to datetime-local format
            const date = new Date(editingInteraction.happened_at);
            const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            setHappenedAt(localDatetime);
            setNotes(editingInteraction.notes || "");
        } else {
            // Default to current time for new interactions
            const now = new Date();
            const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            setHappenedAt(localDatetime);
        }
    }, [editingInteraction, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Convert datetime-local to ISO 8601
            const isoDatetime = new Date(happenedAt).toISOString();

            await onSave({
                contact_id: contactId,
                type,
                direction,
                happened_at: isoDatetime,
                notes: notes.trim() || undefined,
            });

            // Reset form
            setType("email");
            setDirection("outbound");
            setNotes("");
            const now = new Date();
            const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            setHappenedAt(localDatetime);

            onClose();
        } catch (error) {
            console.error("Failed to save interaction:", error);
            alert("Failed to save interaction. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (!isSaving) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-base-200 rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-base-300">
                    <h2 className="text-xl font-bold text-base-content">
                        {editingInteraction ? "Edit Interaction" : "Add Interaction"}
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={isSaving}
                        className="text-base-content opacity-70 hover:opacity-100 hover:bg-base-300 rounded-full p-2 transition-all disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {contactName && (
                        <div className="text-sm text-base-content opacity-70">
                            Contact: <span className="font-medium">{contactName}</span>
                        </div>
                    )}

                    {/* Type selector */}
                    <div>
                        <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                            Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {TYPE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setType(option.value as Interaction["type"])}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${type === option.value
                                            ? "border-primary bg-primary bg-opacity-10"
                                            : "border-base-300 hover:border-base-content hover:border-opacity-30"
                                        }`}
                                >
                                    <span className="text-base-content">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Direction selector */}
                    <div>
                        <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                            Direction
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setDirection("inbound")}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${direction === "inbound"
                                        ? "border-primary bg-primary bg-opacity-10"
                                        : "border-base-300 hover:border-base-content hover:border-opacity-30"
                                    }`}
                            >
                                <span className="text-base-content">← Inbound</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDirection("outbound")}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${direction === "outbound"
                                        ? "border-primary bg-primary bg-opacity-10"
                                        : "border-base-300 hover:border-base-content hover:border-opacity-30"
                                    }`}
                            >
                                <span className="text-base-content">→ Outbound</span>
                            </button>
                        </div>
                    </div>

                    {/* Date/time picker */}
                    <div>
                        <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                            Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={happenedAt}
                            onChange={(e) => setHappenedAt(e.target.value)}
                            required
                            className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                            Notes (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            maxLength={500}
                            rows={4}
                            className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            placeholder="Add any notes about this interaction..."
                        />
                        <div className="text-xs text-base-content opacity-70 text-right mt-1">
                            {notes.length} / 500
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSaving}
                            className="flex-1 px-4 py-3 bg-base-300 text-base-content rounded-lg hover:bg-base-100 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 px-4 py-3 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : editingInteraction ? "Update" : "Add"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
