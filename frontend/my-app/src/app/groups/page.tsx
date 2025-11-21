"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import ChangeTheme from "../components/ChangeTheme";
import GroupCreator from "../components/GroupCreator";
import { Contact } from "@/types/contact";

interface Group {
  id: string;
  name: string;
  color: string;
  user_id: string;
}

interface GroupWithContacts extends Group {
  contacts: Contact[];
}

export default function Groups() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithContacts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupWithContacts | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    loadGroups();
  }, [router]);

  const loadGroups = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsLoading(true);
    try {
      // Load all groups with contacts in a single API call
      const groupsRes = await fetch("http://127.0.0.1:8000/groups/?include_contacts=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!groupsRes.ok) {
        console.error("Failed to fetch groups");
        return;
      }

      const groupsData: GroupWithContacts[] = await groupsRes.json();
      setGroups(groupsData);
    } catch (error) {
      console.error("Failed to load groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/groups/${groupToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setGroups(groups.filter((g) => g.id !== groupToDelete.id));
        setShowDeleteModal(false);
        setGroupToDelete(null);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to delete group");
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleGroupCreated = (newGroup: Group) => {
    setGroups([...groups, { ...newGroup, contacts: [] }]);
  };

  // Filter groups based on search query
  const filteredGroups = groups.filter((group) => {
    const matchesGroup = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContact = group.contacts.some(
      (contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesGroup || matchesContact;
  });



  return (
    <div className="min-h-screen bg-base-100">
      {/* Top Bar - Sticky */}
      <div className="sticky top-0 z-20 bg-base-200 border-b border-base-300 py-6">
        <div className="max-w-7xl mx-auto flex items-center space-between">
          <div className="w-12"></div>

          {/* Left - Title */}
          <div className="flex-shrink-0">
            <h1 className="text-3xl font-bold text-base-content">Groups</h1>
            <p className="text-base-content opacity-70 mt-1">
              Manage your contact groups
            </p>
          </div>

          {/* Center - Search Bar */}
          <div className="flex-1 max-w-md pl-12 pr-12">
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups or contacts..."
                className="w-full pl-10 pr-4 py-3 bg-base-100 border border-base-300 rounded-lg text-base-content placeholder-base-content placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              />
            </div>
          </div>

          {/* Right - New Group Button */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowGroupCreator(true)}
              className="flex items-center space-x-2 px-4 py-3 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>New Group</span>
            </button>
          </div>

          <div className="w-12"></div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {isLoading ? (
          /* Loading Animation */
          <div className="space-y-8">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-base-200 border border-base-300 rounded-lg overflow-hidden animate-pulse">
                <div className="bg-base-300 px-6 py-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-base-100 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-base-100 rounded w-32"></div>
                    <div className="h-4 bg-base-100 rounded w-24"></div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-base-100 border border-base-300 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-base-300 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-base-300 rounded w-3/4"></div>
                          </div>
                        </div>
                        <div className="h-3 bg-base-300 rounded w-full mb-1"></div>
                        <div className="h-3 bg-base-300 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="mb-6 flex items-center justify-between">
              <div className="text-sm text-base-content opacity-70">
                {filteredGroups.length} group{filteredGroups.length === 1 ? "" : "s"}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
              {searchQuery && filteredGroups.length === 0 && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>

            {filteredGroups.length > 0 ? (
          <div className="space-y-8">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-base-200 border border-base-300 rounded-lg overflow-hidden"
              >
                {/* Group Header */}
                <div className="bg-base-300 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-base-content">
                        {group.name}
                      </h3>
                      <p className="text-sm text-base-content opacity-70">
                        {group.contacts.length} contact{group.contacts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setGroupToDelete(group);
                      setShowDeleteModal(true);
                    }}
                    className="text-error hover:opacity-70 transition-opacity p-2"
                    title="Delete group"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Contacts List */}
                <div className="p-6">
                  {group.contacts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="bg-base-100 border border-base-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                              style={{ backgroundColor: group.color }}
                            >
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base-content truncate">
                                {contact.name}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-base-content opacity-70 truncate">
                            {contact.email}
                          </p>
                          <p className="text-sm text-base-content opacity-70 truncate">
                            {contact.phone}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-base-content opacity-50 py-8">
                      No contacts in this group
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
            ) : (
              <div className="text-center py-12">
            <div className="bg-base-200 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-base-content mb-2">
                No groups yet
              </h3>
              <p className="text-base-content opacity-70 mb-4">
                Create your first group to organize your contacts
              </p>
              <div className="w-16 h-16 bg-base-300 rounded-full mx-auto flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-base-content opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-200 rounded-lg p-6 max-w-md w-full mx-4 border border-base-300">
            <h3 className="text-xl font-bold text-base-content mb-4">
              Delete Group
            </h3>
            <p className="text-base-content opacity-70 mb-6">
              Are you sure you want to delete "{groupToDelete.name}"? This will
              remove the group from all contacts.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setGroupToDelete(null);
                }}
                className="px-4 py-2 bg-base-300 text-base-content rounded-lg hover:bg-base-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                className="px-4 py-2 bg-error text-error-content rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Creator */}
      <GroupCreator
        isOpen={showGroupCreator}
        onClose={() => setShowGroupCreator(false)}
        onGroupCreated={handleGroupCreated}
      />

      <Sidebar />
      <ChangeTheme />
    </div>
  );
}
