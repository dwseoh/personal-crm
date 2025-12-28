"use client";
import Sidebar from "../components/Sidebar";
import PriorityContactsPanel from "../components/PriorityContactsPanel";

export default function Dashboard() {
  return (
    <main className="flex min-h-screen bg-base-100">
      <Sidebar />

      <div className="flex-1 p-8 ml-0">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-base-content mb-2">Dashboard</h1>
            <p className="text-base-content opacity-70">
              Overview of your network and insights
            </p>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Priority Contacts (takes 2 columns on large screens) */}
            <div className="lg:col-span-2">
              <PriorityContactsPanel limit={10} />
            </div>

            {/* Right column - Placeholder for future widgets */}
            <div className="space-y-6">
              <div className="bg-base-200 border border-base-300 rounded-lg p-6">
                <h2 className="text-lg font-bold text-base-content mb-2">Quick Stats</h2>
                <p className="text-sm text-base-content opacity-70">
                  Additional insights coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

