"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SimilarContact } from "@/types/interactions";

interface SimilarContactsSectionProps {
    contactId: string;
    contactName?: string;
    limit?: number;
}

export default function SimilarContactsSection({
    contactId,
    contactName,
    limit = 5,
}: SimilarContactsSectionProps) {
    const router = useRouter();
    const [similarContacts, setSimilarContacts] = useState<SimilarContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (contactId) {
            loadSimilarContacts();
        }
    }, [contactId]);

    const loadSimilarContacts = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `http://127.0.0.1:8000/analytics/similar-contacts/${contactId}?limit=${limit}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.ok) {
                const data = await res.json();
                setSimilarContacts(data);
            } else if (res.status === 404) {
                setError("No interaction data available for similarity analysis");
            } else {
                setError("Failed to load similar contacts");
            }
        } catch (error) {
            console.error("Failed to load similar contacts:", error);
            setError("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleContactClick = (similarContactId: string) => {
        router.push(`/interactions?contactId=${similarContactId}`);
    };

    if (isLoading) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-base-content mb-3">Similar Contacts</h3>
                <p className="text-xs text-base-content opacity-70">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-base-content mb-3">Similar Contacts</h3>
                <p className="text-xs text-base-content opacity-70">{error}</p>
            </div>
        );
    }

    if (similarContacts.length === 0) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                <h3 className="text-sm font-medium text-base-content mb-3">Similar Contacts</h3>
                <p className="text-xs text-base-content opacity-70">
                    No similar contacts found. Add more interactions to improve recommendations.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-base-200 border border-base-300 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-base-content mb-3">
                Similar Contacts
            </h3>
            <p className="text-xs text-base-content opacity-70 mb-3">
                Contacts with similar interaction patterns
            </p>

            <div className="space-y-2">
                {similarContacts.map((contact) => (
                    <button
                        key={contact.contact_id}
                        onClick={() => handleContactClick(contact.contact_id)}
                        className="w-full p-2 bg-base-100 border border-base-300 rounded-lg hover:border-primary transition-colors text-left"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-base-content truncate">
                                    {contact.contact_name}
                                </p>
                                <p className="text-xs text-base-content opacity-70">
                                    {contact.explanation}
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="text-xs font-semibold text-primary">
                                    {contact.similarity_score}%
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
