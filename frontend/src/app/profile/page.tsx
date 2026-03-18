"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChangeTheme from "../components/ChangeTheme";
import { User, Mail, Lock, Download, Trash2, Calendar } from "lucide-react";
import { logout } from "@/hooks/useAuth";

interface UserData {
  name: string;
  email: string;
  id: string;
  join_date: string;
  role: string;
}

export default function Profile() {
  const [userData, setUserData] = useState<UserData>({
    name: "",
    email: "",
    id: "",
    join_date: "",
    role: "",
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalInteractions: 0,
    totalGroups: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Check cache for stats
    const CACHE_KEY = "profile_stats";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const cachedStats = localStorage.getItem(CACHE_KEY);

    if (cachedStats) {
      try {
        const { data, timestamp } = JSON.parse(cachedStats);
        if (Date.now() - timestamp < CACHE_TTL) {
          // Use cached stats immediately
          setStats(data);
          setIsLoading(false);
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    try {
      // Fetch user data from /user/ endpoint
      const userRes = await fetch("http://127.0.0.1:8000/user/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userRes.ok) {
        const user = await userRes.json();

        // Check if we got user data
        if (user && user.id) {
          setUserData({
            name: user.name || "User",
            email: user.email || "user@example.com",
            id: user.id || "",
            join_date: user.join_date || "",
            role: user.role || "user",
          });
          setNewName(user.name || "User");

          // Update localStorage with fetched name
          if (user.name) {
            localStorage.setItem("username", user.name);
          }
        } else {
          // Fallback to localStorage if no user data
          const storedName = localStorage.getItem("username") || "User";
          const storedUserId = localStorage.getItem("user_id") || "";
          setUserData({
            name: storedName,
            email: "user@example.com",
            id: storedUserId,
            join_date: "",
            role: "user",
          });
          setNewName(storedName);
        }
      } else {
        // Fallback to localStorage on error
        const storedName = localStorage.getItem("username") || "User";
        const storedUserId = localStorage.getItem("user_id") || "";
        setUserData({
          name: storedName,
          email: "user@example.com",
          id: storedUserId,
          join_date: "",
          role: "user",
        });
        setNewName(storedName);
      }

      // Fetch stats from dashboard analytics if not cached or cache is stale
      if (!cachedStats || Date.now() - JSON.parse(cachedStats).timestamp >= CACHE_TTL) {
        const res = await fetch("http://127.0.0.1:8000/dashboard/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const statsData = {
            totalContacts: data.kpis.total_contacts,
            totalInteractions: data.kpis.interactions_this_month,
            totalGroups: data.kpis.total_groups,
          };
          setStats(statsData);

          // Cache the stats
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: statsData,
            timestamp: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/user/edit/info", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        localStorage.setItem("username", newName);
        setUserData({ ...userData, name: newName });
        setIsEditingName(false);
      } else {
        alert("Failed to update name. Please try again.");
      }
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update name. Please try again.");
    }
  };

  const handleUpdateEmail = async () => {
    // TODO: Implement backend endpoint
    setUserData({ ...userData, email: newEmail });
    setIsEditingEmail(false);
    alert("Email update requested! (Note: Backend integration pending)");
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters!");
      return;
    }
    // TODO: Implement backend endpoint
    setIsEditingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    alert("Password update requested! (Note: Backend integration pending)");
  };

  const handleExportData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [contactsRes, interactionsRes, groupsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/contacts", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://127.0.0.1:8000/interactions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://127.0.0.1:8000/groups", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const contacts = contactsRes.ok ? await contactsRes.json() : [];
      const interactions = interactionsRes.ok ? await interactionsRes.json() : [];
      const groups = groupsRes.ok ? await groupsRes.json() : [];

      const exportData = {
        username: userData.name,
        exportDate: new Date().toISOString(),
        contacts,
        interactions,
        groups,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personal-crm-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${userData.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        localStorage.clear();
        window.location.href = "/";
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-base-100">
      <Sidebar />
      <ChangeTheme />

      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-base-200 border-b border-base-300 py-6">
        <div className="max-w-7xl flex items-center space-between">
          <div className="w-20"></div>
          <div className="flex-shrink-0">
            <h1 className="text-3xl font-bold text-base-content">Profile</h1>
            <p className="text-base-content opacity-70 mt-1">
              Manage your account settings
            </p>
          </div>
          <div className="flex-1"></div>
          <div className="w-24"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* User Info Card */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-primary text-primary-content flex items-center justify-center text-4xl font-bold">
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-base-content">
                  {userData.name}
                </h2>
                {/* Role badge */}
                <span className="px-3 py-1 bg-success bg-opacity-20 text-success-content text-xs font-semibold rounded-full uppercase">
                  {userData.role}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-base-content opacity-70 text-sm">
                  <User className="w-4 h-4" />
                  <span className="font-mono">{userData.id}</span>
                </div>
                <div className="flex items-center gap-2 text-base-content opacity-70 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {formatDate(userData.join_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {isLoading ? (
            // Loading skeletons
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-base-200 border border-base-300 rounded-lg p-4 h-24 overflow-hidden relative">
                  <div className="animate-pulse flex items-center justify-between h-full">
                    <div className="flex-1">
                      <div className="h-3 bg-base-300 rounded w-20 mb-3"></div>
                      <div className="h-6 bg-base-300 rounded w-12"></div>
                    </div>
                    <div className="w-8 h-8 bg-base-300 rounded"></div>
                  </div>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content opacity-70">Contacts</p>
                    <p className="text-2xl font-bold text-base-content mt-1">
                      {stats.totalContacts}
                    </p>
                  </div>
                  <User className="w-8 h-8 text-primary opacity-70" />
                </div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content opacity-70">
                      Interactions
                    </p>
                    <p className="text-2xl font-bold text-base-content mt-1">
                      {stats.totalInteractions}
                    </p>
                    <p className="text-xs text-base-content opacity-60">This month</p>
                  </div>
                  <svg className="w-8 h-8 text-info opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content opacity-70">Groups</p>
                    <p className="text-2xl font-bold text-base-content mt-1">
                      {stats.totalGroups}
                    </p>
                  </div>
                  <svg className="w-8 h-8 text-secondary opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Account Settings */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-base-content mb-4">
            Account Settings
          </h3>

          {/* Name */}
          <div className="py-3 border-b border-base-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-base-content opacity-70" />
                <p className="font-medium text-base-content">Name</p>
              </div>
              {!isEditingName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter new name"
                />
                <button
                  onClick={handleUpdateName}
                  className="px-4 py-2 bg-success text-success-content rounded-lg hover:opacity-90"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNewName(userData.name);
                  }}
                  className="px-4 py-2 bg-base-300 rounded-lg hover:bg-base-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-base-content opacity-70 ml-6">{userData.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="py-3 border-b border-base-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-base-content opacity-70" />
                <p className="font-medium text-base-content">Email Address</p>
              </div>
              {!isEditingEmail && (
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingEmail ? (
              <div className="space-y-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter new email"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateEmail}
                    className="px-4 py-2 bg-success text-success-content rounded-lg hover:opacity-90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingEmail(false);
                      setNewEmail(userData.email);
                    }}
                    className="px-4 py-2 bg-base-300 rounded-lg hover:bg-base-100"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-base-content opacity-60">
                  Note: Backend integration pending
                </p>
              </div>
            ) : (
              <p className="text-base-content opacity-70 ml-6">{userData.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-base-content opacity-70" />
                <p className="font-medium text-base-content">Password</p>
              </div>
              {!isEditingPassword && (
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Change
                </button>
              )}
            </div>
            {isEditingPassword ? (
              <div className="space-y-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="New password (min 8 characters)"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Confirm new password"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdatePassword}
                    className="px-4 py-2 bg-success text-success-content rounded-lg hover:opacity-90"
                  >
                    Update Password
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="px-4 py-2 bg-base-300 rounded-lg hover:bg-base-100"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-base-content opacity-60">
                  Note: Backend integration pending
                </p>
              </div>
            ) : (
              <p className="text-base-content opacity-70 ml-6">••••••••</p>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-base-200 border border-base-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-base-content mb-4">
            Data Management
          </h3>

          {/* Export Data */}
          <div className="flex items-center justify-between py-3 border-b border-base-300">
            <div>
              <p className="font-medium text-base-content">Export Your Data</p>
              <p className="text-sm text-base-content opacity-70">
                Download all your contacts, interactions, and groups as JSON
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content hover:opacity-90 rounded-lg transition-opacity font-medium"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-error">Delete Account</p>
              <p className="text-sm text-base-content opacity-70">
                Permanently delete your account and all data
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-error text-error-content hover:opacity-90 rounded-lg transition-opacity font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full px-4 py-3 bg-base-300 hover:bg-base-100 text-base-content rounded-lg transition-colors font-medium"
        >
          Logout
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-base-100 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-200 border border-base-300 p-6 rounded-xl shadow-2xl w-96 max-w-full">
            <h3 className="text-lg font-bold text-error mb-4">
              Delete Account?
            </h3>
            <p className="mb-6 text-base-content">
              This action cannot be undone. All your contacts, interactions, and
              groups will be permanently deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-base-300 rounded-lg hover:bg-base-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-error text-error-content rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}