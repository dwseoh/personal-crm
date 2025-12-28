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

// Dashboard Analytics Types
export interface DashboardKPIs {
    total_contacts: number;
    new_contacts: number;
    new_contacts_trend: number;
    total_groups: number;
    top_group: {
        name: string;
        count: number;
        color: string;
    } | null;
    avg_importance: number;
    high_priority_count: number;
    interactions_this_month: number;
    top_contact: {
        name: string;
        count: number;
    } | null;
}

export interface GroupDistribution {
    name: string;
    value: number;
    color: string;
}

export interface InteractionTimelineData {
    date: string;
    count: number;
}

export interface DashboardCharts {
    group_distribution: GroupDistribution[];
    importance_distribution: ImportanceDistribution[];
    location_distribution: LocationDistribution[];
    role_distribution: RoleDistribution[];
    interactions_timeline: InteractionTimelineData[];
}

export interface ImportanceDistribution {
    importance: number;
    count: number;
}

export interface LocationDistribution {
    location: string;
    count: number;
}

export interface RoleDistribution {
    role: string;
    count: number;
}

export interface RoleCluster {
    role: string;
    count: number;
    contacts: string[];
}

export interface CompanyCluster {
    company: string;
    count: number;
    avg_importance: number;
    contacts: string[];
}

export interface LocationCluster {
    location: string;
    count: number;
    contacts: string[];
}

export interface NetworkHealth {
    score: number;
    completeness: number;
    balance: number;
    coverage: number;
}

export interface RecentContact {
    id: string;
    name: string;
    created_at: string;
    importance: number;
}

export interface TopCompany {
    company: string;
    count: number;
}

export interface TopRole {
    role: string;
    count: number;
}

export interface GrowingGroup {
    name: string;
    color: string;
    new_count: number;
}

export interface DashboardAnalytics {
    kpis: DashboardKPIs;
    charts: DashboardCharts;
    insights: {
        role_clusters: RoleCluster[];
        company_clusters: CompanyCluster[];
        location_clusters: LocationCluster[];
    };
    sidebar: {
        top_companies: CompanyCluster[];
        top_roles: RoleCluster[];
        growing_groups: any[];
        recent_contacts: RecentContact[];
        network_health: NetworkHealth;
    };
}
