"use client";
import Profiles from "../components/Profiles";
import Sidebar from "../components/Sidebar";
import Add from "../components/Add";
import ChangeTheme from "../components/ChangeTheme";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  interface Contact {
    name: string;
    email: string;
    phone: string;
    notes: string;
  }

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleOpenPanel = (contact: Contact) => {
    setSelectedContact(contact);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedContact(null), 300); // Wait for animation to complete
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

  const contactStrings = contacts.map((contact: any) => [
    contact.name,
    contact.email,
    contact.phone,
    contact.notes
  ]);

  // Show loading skeleton only on initial load with no cached data
  if (isLoading && !hasInitialLoad && contacts.length === 0) {
    return (
      <main className="min-h-screen bg-base-100">
        {/* Header section */}
        <div className="bg-base-200 border-b border-base-300 px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-base-content">Welcome</h1>
            <p className="text-base-content opacity-70 mt-1">Dashboard</p>
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
    <div className="min-h-screen bg-base-100 flex">
      {/* Main content area */}
      <div className={`flex-1 transition-all duration-300 ${isPanelOpen ? 'mr-96' : 'mr-0'}`}>
        {/* Header section */}
        <div className="bg-base-200 border-b border-base-300 px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-base-content">Welcome</h1>
              <p className="text-base-content opacity-70 mt-1">Dashboard</p>
            </div>
            
            {/* Refresh button */}
            <button
              onClick={refreshContacts}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <svg 
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Refreshing indicator */}
          {isRefreshing && (
            <div className="mb-4 p-3 bg-info text-info-content rounded-lg flex items-center space-x-2">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Updating contacts...</span>
            </div>
          )}

          {/* Contacts grid */}
          {contacts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {contactStrings.map((text, index) => (
                <Profiles
                  key={`${text[0]}-${text[1]}-${index}`}
                  name={text[0]}
                  email={text[1]}
                  phone={text[2]}
                  notes={text[3]}
                  onOpenPanel={handleOpenPanel}
                />
              ))}
            </div>
          ) : (
            /* Empty state - only show after initial load is complete */
            hasInitialLoad && (
              <div className="text-center py-12">
                <div className="bg-base-200 rounded-lg p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-base-content mb-2">No contacts yet</h3>
                  <p className="text-base-content opacity-70 mb-4">Get started by adding your first contact</p>
                  <div className="w-16 h-16 bg-base-300 rounded-full mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-base-content opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Right side panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-base-200 border-l border-base-300 shadow-xl transform transition-transform duration-300 z-40 ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedContact && (
          <div className="h-full flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between p-6 border-b border-base-300">
              <h2 className="text-xl font-bold text-base-content">Contact Details</h2>
              <button
                onClick={handleClosePanel}
                className="text-base-content opacity-70 hover:opacity-100 hover:bg-base-300 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-20 h-20 bg-primary text-primary-content rounded-full flex items-center justify-center text-2xl font-bold">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-base-content">{selectedContact.name}</h3>
                  <p className="text-base-content opacity-70">Contact Information</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-base-content opacity-70 mb-2">Email Address</label>
                  <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                    <p className="text-base-content">{selectedContact.email}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-base-content opacity-70 mb-2">Phone Number</label>
                  <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                    <p className="text-base-content">{selectedContact.phone}</p>
                  </div>
                </div>
                
                {selectedContact.notes && (
                  <div>
                    <label className="block text-sm font-medium text-base-content opacity-70 mb-2">Notes</label>
                    <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                      <p className="text-base-content whitespace-pre-wrap">{selectedContact.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed components */}
      <Add />
      <Sidebar />
      <ChangeTheme />
    </div>
  );
}
