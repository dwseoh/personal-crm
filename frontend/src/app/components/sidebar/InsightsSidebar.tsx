"use client";
import { Users, Briefcase, Building2, Clock, TrendingUp, Activity } from "lucide-react";
import type { DashboardAnalytics } from "@/types/interactions";

interface InsightsSidebarProps {
    data: DashboardAnalytics | null;
    isLoading?: boolean;
}

export default function InsightsSidebar({ data, isLoading }: InsightsSidebarProps) {
    if (isLoading) {
        return (
            <aside className="w-80 bg-base-100 border-l border-base-300 p-6 space-y-6 overflow-y-auto hidden lg:block">
                <div className="animate-pulse space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-base-200 h-32 rounded-lg" />
                    ))}
                </div>
            </aside>
        );
    }

    if (!data) {
        return (
            <aside className="w-80 bg-base-100 border-l border-base-300 p-6 hidden lg:block">
                <p className="text-sm text-base-content opacity-70">
                    No insights available
                </p>
            </aside>
        );
    }

    const ungroupedCount =
        data.kpis.total_contacts -
        (data.charts.group_distribution.reduce((sum, g) => sum + g.value, 0) || 0);

    return (
        <aside className="w-80 bg-base-100 border-l border-base-300 p-6 space-y-6 overflow-y-auto hidden lg:block">
            {/* Network Health */}
            <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-success" />
                    <h3 className="text-sm font-semibold text-base-content">
                        Network Health
                    </h3>
                </div>

                <div className="flex flex-col items-center mb-4">
                    <div className={`text-4xl font-bold ${data.sidebar.network_health.score >= 75 ? "text-success" :
                            data.sidebar.network_health.score >= 50 ? "text-warning" : "text-error"
                        }`}>
                        {data.sidebar.network_health.score}
                    </div>
                    <div className="text-xs text-base-content opacity-70">out of 100</div>

                    <div className="w-full h-2 bg-base-300 rounded-full mt-2 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${data.sidebar.network_health.score >= 75 ? "bg-success" :
                                    data.sidebar.network_health.score >= 50 ? "bg-warning" : "bg-error"
                                }`}
                            style={{ width: `${data.sidebar.network_health.score}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-base-content opacity-70">Completeness</span>
                        <span className="font-semibold text-base-content">{data.sidebar.network_health.completeness}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-base-content opacity-70">Balance</span>
                        <span className="font-semibold text-base-content">{data.sidebar.network_health.balance}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-base-content opacity-70">Coverage</span>
                        <span className="font-semibold text-base-content">{data.sidebar.network_health.coverage}%</span>
                    </div>
                </div>
            </div>

            {/* Top Companies */}
            {data.sidebar.top_companies && data.sidebar.top_companies.length > 0 && (
                <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-info" />
                        <h3 className="text-sm font-semibold text-base-content">
                            Top Companies
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {data.sidebar.top_companies.map((company, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between text-xs hover:bg-base-300 p-2 rounded cursor-pointer transition-colors"
                            >
                                <span className="text-base-content truncate flex-1">
                                    {company.company}
                                </span>
                                <span className="font-semibold text-primary ml-2">
                                    {company.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Roles */}
            {data.sidebar.top_roles && data.sidebar.top_roles.length > 0 && (
                <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="w-4 h-4 text-secondary" />
                        <h3 className="text-sm font-semibold text-base-content">
                            Top Roles
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {data.sidebar.top_roles.map((role, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between text-xs hover:bg-base-300 p-2 rounded cursor-pointer transition-colors"
                            >
                                <span className="text-base-content truncate flex-1">
                                    {role.role}
                                </span>
                                <span className="font-semibold text-primary ml-2">
                                    {role.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Contacts */}
            {data.sidebar.recent_contacts && data.sidebar.recent_contacts.length > 0 && (
                <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-success" />
                        <h3 className="text-sm font-semibold text-base-content">
                            Recently Added
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {data.sidebar.recent_contacts.map((contact) => (
                            <div
                                key={contact.id}
                                className="hover:bg-base-300 p-2 rounded cursor-pointer transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-base-content truncate">
                                            {contact.name}
                                        </p>
                                        <p className="text-xs text-base-content opacity-60">
                                            {new Date(contact.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-0.5 flex-shrink-0">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div
                                                key={level}
                                                className={`w-1.5 h-1.5 rounded-full ${level <= contact.importance ? "bg-primary" : "bg-base-300"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ungrouped Contacts */}
            {ungroupedCount > 0 && (
                <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-warning" />
                        <h3 className="text-sm font-semibold text-base-content">
                            Needs Organization
                        </h3>
                    </div>
                    <div className="text-2xl font-bold text-warning mb-1">
                        {ungroupedCount}
                    </div>
                    <p className="text-xs text-base-content opacity-70">
                        contacts ungrouped
                    </p>
                </div>
            )}
        </aside>
    );
}
