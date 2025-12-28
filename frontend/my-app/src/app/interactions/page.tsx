"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import ChangeTheme from "../components/ChangeTheme";
import InteractionTimeline from "../components/InteractionTimeline";
import InteractionModal from "../components/InteractionModal";

interface Interaction {
    id: string;
    contact_id?: string;
    type: "email" | "call" | "dm" | "meet" | "other";
    direction: "inbound" | "outbound";
    happened_at: string;
    notes?: string;
    created_at?: string;
}

interface Contact {
    id: string;
    name: string;
}

export default function InteractionsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const contactIdParam = searchParams.get("contactId");

    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(contactIdParam);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
    const [filterType, setFilterType] = useState<string>("all");
    const [filterDirection, setFilterDirection] = useState<string>("all");
    const [contactSearchQuery, setContactSearchQuery] = useState("");

    // Load contacts on mount
    useEffect(() => {
        loadContacts();
    }, []);

    // Load interactions when contact selection changes
    useEffect(() => {
        loadInteractions();
    }, [selectedContactId]);

    const loadContacts = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/contacts/", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setContacts(data);
            }
        } catch (error) {
            console.error("Failed to load contacts:", error);
        }
    };

    const loadInteractions = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        setIsLoading(true);

        try {
            let url = "http://127.0.0.1:8000/interactions/user/all";

            if (selectedContactId) {
                url = `http://127.0.0.1:8000/interactions/${selectedContactId}`;
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setInteractions(data);
            } else {
                console.error("Failed to load interactions");
            }
        } catch (error) {
            console.error("Failed to load interactions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveInteraction = async (interaction: Omit<Interaction, "id">) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const method = editingInteraction ? "PATCH" : "POST";
        const url = editingInteraction
            ? `http://127.0.0.1:8000/interactions/${editingInteraction.id}`
            : "http://127.0.0.1:8000/interactions/";

        const res = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(interaction),
        });

        if (res.ok) {
            await loadInteractions(); // Auto-refresh after save
            setEditingInteraction(null);
        } else {
            throw new Error("Failed to save interaction");
        }
    };

    const handleDeleteInteraction = async (interactionId: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`http://127.0.0.1:8000/interactions/${interactionId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
            await loadInteractions(); // Auto-refresh after delete
        }
    };

    const handleEditInteraction = (interaction: Interaction) => {
        // If viewing all contacts and editing, temporarily set the contact for the modal
        if (!selectedContactId && interaction.contact_id) {
            setSelectedContactId(interaction.contact_id);
        }
        setEditingInteraction(interaction);
        setIsModalOpen(true);
    };

    const handleAddInteraction = () => {
        if (!selectedContactId) return;
        setEditingInteraction(null);
        setIsModalOpen(true);
    };

    const handleSelectContact = (contactId: string) => {
        setSelectedContactId(contactId);
        setContactSearchQuery("");
        router.push(`/interactions?contactId=${contactId}`);
    };

    const handleClearContact = () => {
        setSelectedContactId(null);
        router.push("/interactions");
    };

    const getSelectedContact = () => {
        return contacts.find((c) => c.id === selectedContactId);
    };

    const getContactName = (contactId?: string) => {
        if (!contactId) return "Unknown";
        const contact = contacts.find((c) => c.id === contactId);
        return contact?.name || "Unknown";
    };

    const filteredInteractions = interactions.filter((interaction) => {
        if (filterType !== "all" && interaction.type !== filterType) return false;
        if (filterDirection !== "all" && interaction.direction !== filterDirection) return false;
        return true;
    });

    const filteredContacts = contacts.filter((contact) =>
        contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase())
    );

    return (
        <main className="flex min-h-screen bg-base-100">
            <Sidebar />

            <div className="flex-1">
                {/* Top Bar - Matching contacts page */}
                <div className="sticky top-0 z-20 bg-base-200 border-b border-base-300 py-6">
                    <div className="max-w-7xl flex items-center space-between">
                        <div className="w-20"></div>

                        {/* Left side - Title */}
                        <div className="flex-shrink-0">
                            <h1 className="text-3xl font-bold text-base-content">
                                {selectedContactId ? `Interactions - ${getSelectedContact()?.name}` : "All Interactions"}
                            </h1>
                            <p className="text-base-content opacity-70 mt-1">
                                {selectedContactId
                                    ? "Communication history with this contact"
                                    : "Track communication history across all contacts"
                                }
                            </p>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1"></div>

                        {/* Right side - Theme toggle */}
                        <div className="flex-shrink-0 flex items-center space-x-4">
                            <ChangeTheme />
                        </div>

                        <div className="w-24"></div>
                    </div>
                </div>

                {/* Main content */}
                <div className="max-w-7xl mx-auto px-8 py-8">
                    {/* Contact search and filters section */}
                    <div className="mb-6 bg-base-200 border border-base-300 rounded-lg p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* Contact search */}
                            <div className="flex-1 min-w-[300px] relative">
                                <label className="block text-sm font-medium text-base-content mb-2">
                                    Filter by Contact
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg
                                            className="h-5 w-5 text-base-content opacity-50"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"
                                            />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={selectedContactId ? getSelectedContact()?.name || "" : contactSearchQuery}
                                        onChange={(e) => {
                                            if (!selectedContactId) {
                                                setContactSearchQuery(e.target.value);
                                            }
                                        }}
                                        placeholder={selectedContactId ? getSelectedContact()?.name || "" : "Search contacts..."}
                                        disabled={!!selectedContactId}
                                        className={`w-full pl-10 pr-4 py-3 bg-base-100 border border-base-300 rounded-lg text-base-content placeholder-base-content placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 ${selectedContactId ? 'cursor-not-allowed opacity-70' : ''
                                            }`}
                                    />
                                    {selectedContactId && (
                                        <button
                                            onClick={handleClearContact}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content opacity-50 hover:opacity-100"
                                            title="Clear selection"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Contact suggestions dropdown */}
                                {contactSearchQuery && !selectedContactId && filteredContacts.length > 0 && (
                                    <div className="absolute mt-2 w-full bg-base-200 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-30">
                                        {filteredContacts.slice(0, 10).map((contact) => (
                                            <button
                                                key={contact.id}
                                                onClick={() => handleSelectContact(contact.id)}
                                                className="w-full px-4 py-3 text-left hover:bg-base-300 transition-colors border-b border-base-300 last:border-b-0"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-sm">
                                                        {contact.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-base-content">{contact.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Type filter */}
                            <div>
                                <label className="block text-sm font-medium text-base-content mb-2">Type</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="px-3 py-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Types</option>
                                    <option value="email">Email</option>
                                    <option value="call">Call</option>
                                    <option value="dm">DM</option>
                                    <option value="meet">Meeting</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Direction filter */}
                            <div>
                                <label className="block text-sm font-medium text-base-content mb-2">Direction</label>
                                <select
                                    value={filterDirection}
                                    onChange={(e) => setFilterDirection(e.target.value)}
                                    className="px-3 py-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Directions</option>
                                    <option value="inbound">← Inbound</option>
                                    <option value="outbound">→ Outbound</option>
                                </select>
                            </div>

                            {/* Clear filters */}
                            {(selectedContactId || filterType !== "all" || filterDirection !== "all") && (
                                <div className="self-end">
                                    <button
                                        onClick={() => {
                                            handleClearContact();
                                            setFilterType("all");
                                            setFilterDirection("all");
                                        }}
                                        className="px-4 py-3 bg-base-200 border border-base-300 text-base-content rounded-lg hover:bg-base-300 transition-colors text-sm"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}

                            {/* Add interaction button - only when contact selected */}
                            {selectedContactId && (
                                <div className="self-end">
                                    <button
                                        onClick={handleAddInteraction}
                                        className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                            />
                                        </svg>
                                        Add Interaction
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Results count */}
                        <div className="mt-3 text-sm text-base-content opacity-70">
                            {filteredInteractions.length} interaction{filteredInteractions.length !== 1 ? "s" : ""}
                            {selectedContactId && ` with ${getSelectedContact()?.name}`}
                        </div>
                    </div>

                    {/* Interactions timeline */}
                    <div className="bg-base-200 border border-base-300 rounded-lg p-6">
                        {isLoading ? (
                            <div className="text-center py-8 text-base-content opacity-70">
                                Loading interactions...
                            </div>
                        ) : (
                            <InteractionTimeline
                                interactions={filteredInteractions}
                                onEdit={handleEditInteraction}
                                onDelete={handleDeleteInteraction}
                                getContactName={getContactName}
                                showContactNames={!selectedContactId}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Interaction modal - only when contact selected */}
            {selectedContactId && (
                <InteractionModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingInteraction(null);
                    }}
                    onSave={handleSaveInteraction}
                    contactId={selectedContactId}
                    contactName={getSelectedContact()?.name}
                    editingInteraction={editingInteraction}
                />
            )}
        </main>
    );
}
