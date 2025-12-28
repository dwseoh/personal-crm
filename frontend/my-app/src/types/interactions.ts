export interface Interaction {
    id: string;
    contact_id?: string;
    type: "email" | "call" | "dm" | "meet" | "other";
    direction: "inbound" | "outbound";
    happened_at: string;
    notes?: string;
    created_at?: string;
}

export interface Contact {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    current_role?: string;
    location?: string;
    importance?: number;
    notes?: string;
    created_at?: string;
}

export interface PriorityContact {
    contact_id: string;
    contact_name: string;
    score: number;
    explanation: string;
    days_since_last: number;
    total_interactions_30d: number;
}

export interface SimilarContact {
    contact_id: string;
    contact_name: string;
    similarity_score: number;
    explanation: string;
}
