"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChangeTheme from "../components/ChangeTheme";
import GroupDistributionChart from "../components/charts/GroupDistributionChart";
import InteractionsTimelineChart from "../components/charts/InteractionsTimelineChart";
import InsightsSidebar from "../components/sidebar/InsightsSidebar";
import PriorityContactsPanel from "../components/PriorityContactsPanel";
import { Users, UserPlus, TrendingUp, MessageSquare, Activity } from "lucide-react";
import type { DashboardAnalytics } from "@/types/interactions";
import type { PriorityContact } from "@/types/interactions";
import { formatNumber, truncateText } from "@/utils/formatters";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics | null>(null);
  const [priorityContacts, setPriorityContacts] = useState<PriorityContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPriorityLoading, setIsPriorityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityMode, setPriorityMode] = useState("default");

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (dashboardData) {
      // If we have bundled priority contacts and we're in default mode, use them
      // This saves an API call on initial load
      if (
        priorityMode === "default" &&
        dashboardData.sidebar?.priority_contacts &&
        dashboardData.sidebar.priority_contacts.length > 0
      ) {
        setPriorityContacts(dashboardData.sidebar.priority_contacts);
      } else {
        // Otherwise fetch as usual (e.g. for other modes or if not bundled)
        loadPriorityContacts();
      }
    }
  }, [priorityMode, dashboardData]);

  const loadDashboardData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    // Check cache first
    const CACHE_KEY = "dashboard_analytics";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_TTL) {
          // Use cached data immediately
          setDashboardData(data);
          setIsLoading(false);
          return; // Don't fetch if cache is fresh
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/dashboard/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);

        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPriorityContacts = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Don't fetch if we already used bundled data (checked in useEffect)
    // But inside this function we just fetch. The guard is in useEffect.

    setIsPriorityLoading(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/analytics/priority-contacts?mode=${priorityMode}&limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setPriorityContacts(data);
      }
    } catch (error) {
      console.error("Failed to load priority contacts:", error);
    } finally {
      setIsPriorityLoading(false);
    }
  };

  const renderStatCards = () => {
    if (isLoading) {
      return (
        <>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-base-200 border border-base-300 rounded-lg p-4 h-24 overflow-hidden relative">
              <div className="animate-pulse flex items-center justify-between h-full">
                <div className="flex-1">
                  <div className="h-3 bg-base-300 rounded w-24 mb-3"></div>
                  <div className="h-6 bg-base-300 rounded w-16"></div>
                </div>
                <div className="w-8 h-8 bg-base-300 rounded"></div>
              </div>
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>
          ))}
        </>
      );
    }

    if (!dashboardData) return null;

    const { kpis } = dashboardData;
    const ungroupedCount =
      kpis.total_contacts -
      (dashboardData.charts.group_distribution.reduce((sum, g) => sum + g.value, 0) || 0);

    return (
      <>
        {/* Total Contacts */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content opacity-70">Total Contacts</p>
              <p className="text-2xl font-bold text-base-content mt-1">{formatNumber(kpis.total_contacts)}</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-70" />
          </div>
        </div>

        {/* New This Month */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content opacity-70">New This Month</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-base-content">{kpis.new_contacts}</p>
                {kpis.new_contacts_trend !== 0 && (
                  <span
                    className={`text-xs font-semibold flex items-center gap-0.5 ${kpis.new_contacts_trend >= 0 ? "text-success" : "text-error"
                      }`}
                  >
                    <TrendingUp className={`w-3 h-3 ${kpis.new_contacts_trend < 0 ? "rotate-180" : ""}`} />
                    {Math.abs(kpis.new_contacts_trend)}%
                  </span>
                )}
              </div>
            </div>
            <UserPlus className="w-8 h-8 text-success opacity-70" />
          </div>
        </div>

        {/* Interactions This Month */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content opacity-70">Interactions</p>
              <p className="text-2xl font-bold text-base-content mt-1">{kpis.interactions_this_month}</p>
              <p className="text-xs text-base-content opacity-60 mt-0.5">This month</p>
            </div>
            <MessageSquare className="w-8 h-8 text-info opacity-70" />
          </div>
        </div>

        {/* Top Contact by Interactions */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-base-content opacity-70">Most Active</p>
              <p className="text-lg font-bold text-base-content mt-1 truncate">
                {kpis.top_contact?.name || "N/A"}
              </p>
              <p className="text-xs text-base-content opacity-60 mt-0.5">
                {kpis.top_contact ? `${kpis.top_contact.count} interactions` : "No interactions yet"}
              </p>
            </div>
            <Activity className="w-8 h-8 text-accent opacity-70 flex-shrink-0" />
          </div>
        </div>

        {/* Total Groups */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content opacity-70">Groups</p>
              <p className="text-2xl font-bold text-base-content mt-1">{kpis.total_groups}</p>
            </div>
            <svg className="w-8 h-8 text-secondary opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
        </div>

        {/* High Priority */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content opacity-70">High Priority</p>
              <p className="text-2xl font-bold text-base-content mt-1">{kpis.high_priority_count}</p>
              <p className="text-xs text-base-content opacity-60 mt-0.5">Importance ≥ 4</p>
            </div>
            <svg className="w-8 h-8 text-warning opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
        </div>

        {/* Ungrouped */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content opacity-70">Ungrouped</p>
              <p className="text-2xl font-bold text-base-content mt-1">{ungroupedCount}</p>
              <p className="text-xs text-base-content opacity-60 mt-0.5">
                {kpis.total_contacts > 0
                  ? `${Math.round((ungroupedCount / kpis.total_contacts) * 100)}% of total`
                  : "0% of total"}
              </p>
            </div>
            <svg className="w-8 h-8 text-base-content opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Largest Group */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-base-content opacity-70">Largest Group</p>
              <p className="text-lg font-bold text-base-content mt-1 truncate">
                {kpis.top_group?.name || "N/A"}
              </p>
              <p className="text-xs text-base-content opacity-60 mt-0.5">
                {kpis.top_group ? `${kpis.top_group.count} contacts` : "No groups yet"}
              </p>
            </div>
            <svg className="w-8 h-8 text-primary opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-base-100">
      <Sidebar />
      <ChangeTheme />

      {/* Top Bar with Flexbox Layout - Sticky */}
      <div className="sticky top-0 z-20 bg-base-200 border-b border-base-300 py-6">
        <div className="max-w-7xl flex items-center space-between">
          <div className="w-20"></div>

          {/* Left side - Title */}
          <div className="flex-shrink-0">
            <h1 className="text-3xl font-bold text-base-content">
              Dashboard
            </h1>
            <p className="text-base-content opacity-70 mt-1">
              Overview of your network and insights
            </p>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Right side - Optional actions */}
          <div className="flex-shrink-0 flex items-center space-x-8">
            {/* Future: Add refresh button or filters here */}
          </div>

          <div className="w-24"></div>
        </div>
      </div>

      {/* Content area with sidebar */}
      <div className="flex">
        {/* Main content area */}
        <div className="flex-1 max-w-7xl mx-auto px-8 py-8">
          {/* Error State */}
          {error && (
            <div className="bg-error bg-opacity-10 border border-error rounded-lg p-4 mb-6">
              <p className="text-error font-medium">{error}</p>
              <button
                onClick={loadDashboardData}
                className="mt-2 text-sm text-error underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Stat Cards Grid - 4 columns, more compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {renderStatCards()}
          </div>

          {/* Charts Grid - 2 columns */}
          {!isLoading && dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <GroupDistributionChart
                data={dashboardData.charts.group_distribution}
                totalContacts={dashboardData.kpis.total_contacts}
              />
              <InteractionsTimelineChart
                data={dashboardData.charts.interactions_timeline}
              />
            </div>
          )}

          {/* Loading State for Charts */}
          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-base-200 border border-base-300 rounded-lg p-6 h-96 animate-pulse" />
              <div className="bg-base-200 border border-base-300 rounded-lg p-6 h-96 animate-pulse" />
            </div>
          )}

          {/* Priority Contacts Panel - Now with controlled data */}
          <div className="mb-8">
            <PriorityContactsPanel
              priorityContacts={priorityContacts}
              isLoading={isPriorityLoading}
              onModeChange={setPriorityMode}
              selectedMode={priorityMode}
            />
          </div>
        </div>

        {/* Insights Sidebar */}
        <InsightsSidebar data={dashboardData} isLoading={isLoading} />
      </div>
    </div>
  );
}
