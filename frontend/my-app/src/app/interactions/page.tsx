"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import InteractionTimeline from "../components/InteractionTimeline";
import InteractionModal from "../components/InteractionModal";

interface Interaction {
    id: string;
    contact_id: string;
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
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadContacts();
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
            await loadInteractions();
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
            await loadInteractions();
        }
    };

    const handleEditInteraction = (interaction: Interaction) => {
        setEditingInteraction(interaction);
        setIsModalOpen(true);
    };

    const handleAddInteraction = () => {
        setEditingInteraction(null);
        setIsModalOpen(true);
    };

    const getSelectedContact = () => {
        return contacts.find((c) => c.id === selectedContactId);
    };

    const filteredInteractions = interactions.filter((interaction) => {
        if (filterType !== "all" && interaction.type !== filterType) return false;
        if (filterDirection !== "all" && interaction.direction !== filterDirection) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return interaction.notes?.toLowerCase().includes(query);
        }
        return true;
    });

    return (
        <main className="flex min-h-screen bg-base-100">
            <Sidebar />

            <div className="flex-1 p-8 ml-0">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-base-content mb-2">Interactions</h1>
                        <p className="text-base-content opacity-70">
                            Track your communication history with contacts
                        </p>
                    </div>

                    {/* Contact selector and filters */}
                    <div className="bg-base-200 border border-base-300 rounded-lg p-4 mb-6 space-y-4">
                        {/* Contact selector */}
                        <div>
                            <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                                Filter by Contact
                            </label>
                            <select
                                value={selectedContactId || "all"}
                                onChange={(e) => {
                                    const value = e.target.value === "all" ? null : e.target.value;
                                    setSelectedContactId(value);
                                    if (value) {
                                        router.push(`/interactions?contactId=${value}`);
                                    } else {
                                        router.push("/interactions");
                                    }
                                }}
                                className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">All Contacts</option>
                                {contacts.map((contact) => (
                                    <option key={contact.id} value={contact.id}>
                                        {contact.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filters row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Type filter */}
                            <div>
                                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                                    Type
                                </label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Types</option>
                                    <option value="email">📧 Email</option>
                                    <option value="call">📞 Call</option>
                                    <option value="dm">💬 DM</option>
                                    <option value="meet">🤝 Meeting</option>
                                    <option value="other">⭐ Other</option>
                                </select>
                            </div>

                            {/* Direction filter */}
                            <div>
                                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                                    Direction
                                </label>
                                <select
                                    value={filterDirection}
                                    onChange={(e) => setFilterDirection(e.target.value)}
                                    className="w-full p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Directions</option>
                                    <option value="inbound">← Inbound</option>
                                    <option value="outbound">→ Outbound</option>
                                </select>
                            </div>

                            {/* Search */}
                            <div>
                                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                                    Search Notes
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Add interaction button */}
                    <div className="mb-6">
                        <button
                            onClick={handleAddInteraction}
                            className="px-4 py-3 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                    {/* Interactions timeline */}
                    <div className="bg-base-200 border border-base-300 rounded-lg p-6">
                        {isLoading ? (
                            <div className="text-center py-8 text-base-content opacity-70">
                                Loading interactions...
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <h2 className="text-lg font-semibold text-base-content">
                                        {selectedContactId
                                            ? `Interactions with ${getSelectedContact()?.name}`
                                            : "All Interactions"}
                                    </h2>
                                    <p className="text-sm text-base-content opacity-70">
                                        {filteredInteractions.length} interaction{filteredInteractions.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                <InteractionTimeline
                                    interactions={filteredInteractions}
                                    onEdit={handleEditInteraction}
                                    onDelete={handleDeleteInteraction}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Interaction modal */}
            <InteractionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingInteraction(null);
                }}
                onSave={handleSaveInteraction}
                contactId={selectedContactId || (contacts[0]?.id || "")}
                contactName={selectedContactId ? getSelectedContact()?.name : undefined}
                editingInteraction={editingInteraction}
            />
        </main>
    );
}
