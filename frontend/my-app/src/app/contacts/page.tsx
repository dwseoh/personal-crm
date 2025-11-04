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
  }
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
      .then((data) => {
        const contactsData = Array.isArray(data) ? data : [];
        setContacts(contactsData);
        localStorage.setItem("cached_contacts", JSON.stringify(contactsData));
      })
      .catch((err) => console.error("Refresh failed:", err))
      .finally(() => setIsRefreshing(false));
  };

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.notes &&
        contact.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Show loading skeleton only on initial load with no cached data
  if (isLoading && !hasInitialLoad && contacts.length === 0) {
    return (
      <main className="min-h-screen bg-base-100">
        {/* Header section */}
        <div className="bg-base-200 border-b border-base-300 px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-base-content">Welcome</h1>
            <p className="text-base-content opacity-70 mt-1">Contacts</p>
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
      <Sidebar />

      <div className="bg-base-200 border-b border-base-300 px-8 py-13">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="absolute left-21 top-5">
            <h1 className="text-3xl font-bold text-base-content">Welcome</h1>
            <p className="text-base-content opacity-70 mt-1">Contacts</p>
          </div>

          {/* Refresh button */}
          <button
            onClick={refreshContacts}
            disabled={isRefreshing}
            className="absolute right-20 top-7 flex items-center space-x-2  px-4 py-3 h-12 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
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
          </button>
        </div>
      </div>

      {/* Main content area - Only this part shrinks */}
      <div
        className={`transition-all duration-300 ${
          isPanelOpen ? "mr-96" : "mr-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md search-bar">
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
                className="w-full pl-10 pr-4 py-3 bg-base-200 border border-base-300 rounded-lg text-base-content placeholder-base-content placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-base-content opacity-50 bg-base-300 border border-base-300 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="mb-4 text-sm text-base-content opacity-70">
              {filteredContacts.length === 0
                ? `No contacts found for "${searchQuery}"`
                : `Found ${filteredContacts.length} contact${
                    filteredContacts.length === 1 ? "" : "s"
                  } for "${searchQuery}"`}
            </div>
          )}

          {/* Contacts grid */}
          {contacts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredContacts.map((contact, index) => (
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
            </div>
          ) : (
            /* Empty state - only show after initial load is complete */
            hasInitialLoad && (
              <div className="text-center py-12">
                <div className="bg-base-200 rounded-lg p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-base-content mb-2">
                    No contacts yet
                  </h3>
                  <p className="text-base-content opacity-70 mb-4">
                    Get started by adding your first contact
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
      />
      <Add />
      <Sidebar />
      <ChangeTheme />
      
    </div>
  );
}
