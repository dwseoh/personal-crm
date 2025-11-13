"use client";
import Profiles from "../components/Profiles";
import Sidebar from "../components/Sidebar";
import Add from "../components/Add";
import ChangeTheme from "../components/ChangeTheme";
import ContactPanel from "../components/ContactPanel";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Contacts() {
  interface Contact {
    id?: string;
    name: string;
    email: string;
    phone: string;
    notes: string;
    created_at?: string;
  }
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelWidthPct, setPanelWidthPct] = useState(26);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  useEffect(() => {
    if (isPanelOpen && !hasOpenedOnce) {
      setHasOpenedOnce(true);
    }
  }, [isPanelOpen]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name, newest, oldest
  const [filterByGroup, setFilterByGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [contactGroups, setContactGroups] = useState<{
    [contactId: string]: string[];
  }>({});
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [viewMode, setViewMode] = useState<"block" | "list">("block");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set()
  );
  const editingRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder="Search contacts..."]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /*
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        editingRef.current &&
        !editingRef.current.contains(event.target as Node)
      ) {
        setIsPanelOpen(false);
      }
    }
    document.addEventListener("mouseup", handleClickOutside);
    return () => {
      document.removeEventListener("mouseup", handleClickOutside);
    };
  }, [editingRef]);
  */

  const handleOpenPanel = (contact: Contact) => {
    setSelectedContact(contact);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedContact(null), 300); // Wait for animation to complete
  };

  const handleContactUpdate = (updatedContact: Contact) => {
    // Update the contact in the local state
    const updatedContacts = contacts.map((contact) =>
      contact.id === updatedContact.id ? updatedContact : contact
    );
    setContacts(updatedContacts);
    setSelectedContact(updatedContact);

    // Update cache
    localStorage.setItem("cached_contacts", JSON.stringify(updatedContacts));
  };

  // Load cached contacts immediately
  useEffect(() => {
    const cachedContacts = localStorage.getItem("cached_contacts");
    if (cachedContacts) {
      try {
        const parsed = JSON.parse(cachedContacts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setContacts(parsed);
          loadContactGroups(parsed); // Load groups for cached contacts
          setHasInitialLoad(true);
        }
      } catch (error) {
        console.error("Error parsing cached contacts:", error);
      }
    }
  }, []);

  // Fetch fresh contacts from API
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const fetchContacts = async () => {
      if (hasInitialLoad) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/contacts/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json();
          console.error("Error:", errData);
          if (errData.detail?.includes("expired")) {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("user_id");
            localStorage.removeItem("cached_contacts");
            router.push("/login");
          }
          throw new Error(errData.detail || "Failed to fetch contacts");
        }

        const data = await res.json();
        const contactsData = Array.isArray(data) ? data : [];

        setContacts(contactsData);

        // Load groups for each contact
        await loadContactGroups(contactsData);

        // Cache the contacts for next time
        localStorage.setItem("cached_contacts", JSON.stringify(contactsData));

        if (!hasInitialLoad) {
          setHasInitialLoad(true);
        }
      } catch (err) {
        console.error("Failed to fetch contacts:", err);
        // If we have cached contacts, keep showing them
        if (!hasInitialLoad && contacts.length === 0) {
          // Only show error if we have no cached data
          console.error("No cached contacts available");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchContacts();
  }, [router, hasInitialLoad]);

  // Load available groups for filtering
  useEffect(() => {
    const loadGroups = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://127.0.0.1:8000/groups/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const groups = await res.json();
          setAvailableGroups(groups);
        }
      } catch (error) {
        console.error("Failed to load groups:", error);
      }
    };

    loadGroups();
  }, []);

  // Load groups for contacts
  const loadContactGroups = async (contactsData: Contact[]) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingGroups(true);
    const groupsMap: { [contactId: string]: string[] } = {};

    try {
      // Load groups for each contact
      await Promise.all(
        contactsData.map(async (contact) => {
          if (contact.id) {
            try {
              const res = await fetch(
                `http://127.0.0.1:8000/contacts/${contact.id}/groups`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (res.ok) {
                const groups = await res.json();
                groupsMap[contact.id] = groups.map((g: any) => g.id);
              } else {
                groupsMap[contact.id] = [];
              }
            } catch (error) {
              console.error(
                `Failed to load groups for contact ${contact.id}:`,
                error
              );
              groupsMap[contact.id] = [];
            }
          }
        })
      );

      setContactGroups(groupsMap);
    } catch (error) {
      console.error("Failed to load contact groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Refresh function for manual refresh
  const refreshContacts = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsRefreshing(true);

    fetch("http://127.0.0.1:8000/contacts/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Failed to fetch contacts");
        }
        return res.json();
      })
      .then(async (data) => {
        const contactsData = Array.isArray(data) ? data : [];
        setContacts(contactsData);
        await loadContactGroups(contactsData);
        localStorage.setItem("cached_contacts", JSON.stringify(contactsData));
      })
      .catch((err) => console.error("Refresh failed:", err))
      .finally(() => setIsRefreshing(false));
  };

  // Filter and sort contacts
  const filteredAndSortedContacts = (() => {
    // First filter by search query
    let filtered = contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.notes &&
          contact.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Then filter by group
    if (filterByGroup !== "all") {
      filtered = filtered.filter((contact) => {
        if (!contact.id) return false;
        const groups = contactGroups[contact.id] || [];
        return groups.includes(filterByGroup);
      });
    }

    // Then sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "oldest":
          // Assuming contacts have a created_at field or we use id as proxy
          return (b.id || "").localeCompare(a.id || "");
        case "newest":
          return (a.id || "").localeCompare(b.id || "");
        case "email":
          return a.email.localeCompare(b.email);
        default:
          return 0;
      }
    });

    return filtered;
  })();

  // Show loading skeleton only on initial load with no cached data
  if (isLoading && !hasInitialLoad && contacts.length === 0) {
    return (
      <main className="min-h-screen bg-base-100">
        {/* Header section */}
        <div className="bg-base-200 border-b border-base-300 px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-base-content">
              All Contacts
            </h1>
            <p className="text-base-content opacity-70 mt-1">Browse...</p>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-base-200 border border-base-300 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-base-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-base-300 rounded w-3/4"></div>
                      <div className="h-3 bg-base-300 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Add />
        <Sidebar />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Top Bar with Flexbox Layout */}
      <div className="bg-base-200 border-b border-base-300 py-6">
        <div className="max-w-7xl mx-auto flex items-center space-between">
          <div className="w-12"></div>

          {/* Left side - Title */}
          <div className="flex-shrink-0 ">
            <h1 className="text-3xl font-bold text-base-content">
              All Contacts
            </h1>
            <p className="text-base-content opacity-70 mt-1">
              Browse and manage your contacts
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
                placeholder="Search contacts..."
                className="w-full pl-10 pr-16 py-3 bg-base-100 border border-base-300 rounded-lg text-base-content placeholder-base-content placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-base-content opacity-50 bg-base-300 border border-base-300 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right side - View Toggle and Refresh button */}
          <div className="flex-shrink-0 flex items-center space-x-8">
            {/* View Toggle Buttons */}
            <div className="flex items-center space-x-1 bg-base-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode("block")}
                className={`p-2 rounded transition-opacity ${
                  viewMode === "block"
                    ? "bg-base-100 text-base-content"
                    : "text-base-content opacity-25 hover:opacity-100"
                }`}
                title="Block view"
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
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-opacity ${
                  viewMode === "list"
                    ? "bg-base-100 text-base-content"
                    : "text-base-content opacity-25 hover:opacity-100"
                }`}
                title="List view"
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
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {/* <button
              onClick={refreshContacts}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-3 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button> */}
          </div>

          <div className="w-12"></div>
        </div>
      </div>

      {/* Main content area - Only this part shrinks */}
      <div
        className={`transition-all duration-300`}
        style={{
          marginRight: isPanelOpen ? `${panelWidthPct}vw` : 0,
          transition: !hasOpenedOnce ? "margin-right 0.3s" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Filter and Sort Controls */}
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-base-content">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="name">Name (A-Z)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="email">Email (A-Z)</option>
              </select>
            </div>

            {/* Group Filter Dropdown - Only show if groups are available */}
            {availableGroups.length > 0 && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-base-content">
                  Filter by group:
                </label>
                <select
                  value={filterByGroup}
                  onChange={(e) => setFilterByGroup(e.target.value)}
                  disabled={loadingGroups}
                  className="px-3 py-2 bg-base-200 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="all">All Groups</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name.length > 20
                        ? group.name.slice(0, 20) + "..."
                        : group.name}
                    </option>
                  ))}
                </select>
                {loadingGroups && (
                  <div className="text-xs text-base-content opacity-50">
                    Loading...
                  </div>
                )}
              </div>
            )}

            {/* Clear Filters Button */}
            {(searchQuery || sortBy !== "name" || filterByGroup !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSortBy("name");
                  setFilterByGroup("all");
                }}
                className="px-3 py-2 bg-base-300 text-base-content rounded-lg hover:bg-base-200 transition-colors text-sm"
              >
                Clear Filters
              </button>
            )}

            {/* Delete Selected Button - Only show in list view when items are selected */}
            {viewMode === "list" && selectedContactIds.size > 0 && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-error text-error-content rounded-lg hover:opacity-90 transition-opacity"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete ({selectedContactIds.size})</span>
              </button>
            )}

            {/* Results Count */}
            <div className="text-sm text-base-content opacity-70 ml-auto">
              {filteredAndSortedContacts.length} contact
              {filteredAndSortedContacts.length === 1 ? "" : "s"}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>

          {/* Contacts display - Block or List view */}
          {contacts.length > 0 ? (
            viewMode === "block" ? (
              <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                {filteredAndSortedContacts.map((contact, index) => (
                  <Profiles
                    key={
                      contact.id || `${contact.name}-${contact.email}-${index}`
                    }
                    id={contact.id}
                    name={contact.name}
                    email={contact.email}
                    phone={contact.phone}
                    notes={contact.notes}
                    onOpenPanel={handleOpenPanel}
                  />
                ))}
              </div> // IMPROVE RESPONSIVE GRID
            ) : (
              // List view with table
              <div className="bg-base-200 border border-base-300 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    {/* Table Header */}
                    <thead className="bg-base-300 border-b border-base-300">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">
                          <input
                            type="checkbox"
                            checked={
                              filteredAndSortedContacts.length > 0 &&
                              filteredAndSortedContacts.every(
                                (c) => c.id && selectedContactIds.has(c.id)
                              )
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allIds = new Set(
                                  filteredAndSortedContacts
                                    .filter((c) => c.id)
                                    .map((c) => c.id!)
                                );
                                setSelectedContactIds(allIds);
                              } else {
                                setSelectedContactIds(new Set());
                              }
                            }}
                            className="checkbox checkbox-sm"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-base-content">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-base-content">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-base-content">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-base-content">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-base-content">
                          Notes
                        </th>
                        <th className="px-4 py-3 text-left w-12"></th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody>
                      {filteredAndSortedContacts.map((contact, index) => {
                        const isSelected = contact.id
                          ? selectedContactIds.has(contact.id)
                          : false;
                        return (
                          <tr
                            key={
                              contact.id ||
                              `${contact.name}-${contact.email}-${index}`
                            }
                            className="border-b border-base-300 transition-all relative group"
                            style={{
                              backgroundColor: isSelected
                                ? "rgba(0, 0, 0, 0.15)"
                                : "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (isSelected) {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(0, 0, 0, 0.25)";
                              } else {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(0, 0, 0, 0.08)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isSelected) {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(0, 0, 0, 0.15)";
                              } else {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }
                            }}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (!contact.id) return;
                                  const newSelected = new Set(
                                    selectedContactIds
                                  );
                                  if (e.target.checked) {
                                    newSelected.add(contact.id);
                                  } else {
                                    newSelected.delete(contact.id);
                                  }
                                  setSelectedContactIds(newSelected);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="checkbox checkbox-sm"
                              />
                            </td>
                            <td
                              className="px-4 py-3 cursor-pointer"
                              onClick={() => handleOpenPanel(contact)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                  {contact.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-base-content">
                                  {contact.name}
                                </span>
                              </div>
                            </td>
                            <td
                              className="px-4 py-3 text-sm text-base-content opacity-70 cursor-pointer"
                              onClick={() => handleOpenPanel(contact)}
                            >
                              {contact.email}
                            </td>
                            <td
                              className="px-4 py-3 text-sm text-base-content opacity-70 cursor-pointer"
                              onClick={() => handleOpenPanel(contact)}
                            >
                              {contact.phone}
                            </td>
                            <td
                              className="px-4 py-3 text-sm text-base-content opacity-70 cursor-pointer"
                              onClick={() => handleOpenPanel(contact)}
                            >
                              {contact.created_at
                                ? new Date(
                                    contact.created_at
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td
                              className="px-4 py-3 text-sm text-base-content opacity-70 cursor-pointer max-w-xs truncate"
                              onClick={() => handleOpenPanel(contact)}
                            >
                              {contact.notes || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleOpenPanel(contact)}
                                className="text-base-content opacity-50 hover:opacity-100 transition-opacity"
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
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* Empty state - show different messages based on context */
            hasInitialLoad && (
              <div className="text-center py-12">
                <div className="bg-base-200 rounded-lg p-8 max-w-md mx-auto">
                  {contacts.length === 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-base-content mb-2">
                        No contacts yet
                      </h3>
                      <p className="text-base-content opacity-70 mb-4">
                        Get started by adding your first contact
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-base-content mb-2">
                        No contacts match your filters
                      </h3>
                      <p className="text-base-content opacity-70 mb-4">
                        Try adjusting your search or filter criteria
                      </p>
                    </>
                  )}
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
            )
          )}
        </div>
      </div>

      {/* Contact Panel Component */}
      <ContactPanel
        selectedContact={selectedContact}
        isPanelOpen={isPanelOpen}
        onClosePanel={handleClosePanel}
        onContactUpdate={handleContactUpdate}
        onContactDeleted={refreshContacts}
        onWidthChange={(widthPct) => setPanelWidthPct(widthPct)}
      />

      {/* Bulk Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-base-100 bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-300 p-6 rounded-xl shadow-2xl relative w-96 max-w-full">
            <h3 className="text-xl font-bold text-base-content mb-4">
              Delete Selected Contacts
            </h3>
            <p className="text-base-content opacity-70 mb-6">
              Are you sure you want to delete {selectedContactIds.size} contact
              {selectedContactIds.size === 1 ? "" : "s"}? This action cannot be
              undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-base-300 text-base-content rounded-lg hover:bg-base-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const token = localStorage.getItem("token");
                  if (!token) return;

                  try {
                    // Delete all selected contacts
                    await Promise.all(
                      Array.from(selectedContactIds).map(async (contactId) => {
                        const res = await fetch(
                          `http://127.0.0.1:8000/contacts/${contactId}`,
                          {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                          }
                        );
                        if (!res.ok)
                          throw new Error("Failed to delete contact");
                      })
                    );

                    // Clear selection and refresh
                    setSelectedContactIds(new Set());
                    setShowDeleteModal(false);
                    refreshContacts();
                  } catch (error) {
                    console.error("Error deleting contacts:", error);
                    alert("Failed to delete some contacts. Please try again.");
                  }
                }}
                className="px-4 py-2 bg-error text-error-content rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Add />

      {/* Temporary boxes to prevent overlap when zooming */}

      <Sidebar />

      <ChangeTheme />
    </div>
  );
}
