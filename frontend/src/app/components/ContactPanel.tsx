"use client";
import { useState, useEffect, useRef } from "react";
import GroupCreator from "./GroupCreator";
import { useRouter } from "next/navigation";
import InteractionTimeline from "./InteractionTimeline";
import InteractionModal from "./InteractionModal";
import SimilarContactsSection from "./SimilarContactsSection";
import type { Interaction } from "@/types/interactions";

import { Contact } from "@/types/contact";

interface Group {
  id: string;
  name: string;
  color: string;
  user_id: string;
}

interface ContactPanelProps {
  selectedContact: Contact | null;
  isPanelOpen: boolean;
  onClosePanel: () => void;
  onContactUpdate: (updatedContact: Contact) => void;
  onContactDeleted?: () => void;
  onWidthChange?: (widthPct: number) => void; //
}

export default function ContactPanel({
  selectedContact,
  isPanelOpen,
  onClosePanel,
  onContactUpdate,
  onContactDeleted,
  onWidthChange, //
}: ContactPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState<Contact>({
    name: "",
    email: "",
    phone: "",
    notes: "",
    current_role: "",
    company: "",
    location: "",
    importance: 1
  });

  // Group-related state
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [contactGroups, setContactGroups] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [panelWidthPct, setPanelWidthPct] = useState(26); // 25% of viewport
  const isResizing = useRef(false);

  // Interactions state
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);

  const onMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none"; // prevent text selection
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isResizing.current) {
      const newWidthPx = window.innerWidth - e.clientX; // since panel is right-aligned
      const newWidthPct = (newWidthPx / window.innerWidth) * 100;

      if (newWidthPct > 26 && newWidthPct < 50) {
        // min/max width
        setPanelWidthPct(newWidthPct);
        onWidthChange?.(newWidthPct);
      }
    }
  };

  const onMouseUp = () => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto"; // restore selection
    }
  };

  // Attach/remove global listeners
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);
  // Load groups and contact groups when contact changes
  useEffect(() => {
    if (selectedContact?.id) {
      loadAvailableGroups();
      loadContactGroups(selectedContact.id);
      loadInteractions(selectedContact.id);
    }
  }, [selectedContact]);

  // Update edit form when contact changes
  useEffect(() => {
    if (selectedContact) {
      setEditForm(selectedContact);
      setSelectedGroups([...contactGroups]);
    }
  }, [selectedContact, contactGroups]);

  const loadAvailableGroups = async () => {
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

  const handleDeleteContact = async () => {
    setShowDeleteModal(false); // Close modal first
    if (!selectedContact?.id) return;

    const token = localStorage.getItem("token");
    setIsDeleting(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/contacts/${selectedContact.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.detail?.includes("expired")) {
          localStorage.removeItem("token");
          localStorage.removeItem("cached_contacts");
          router.push("/login");
          return;
        }
        throw new Error(errData.detail || "Failed to delete contact");
      }

      // Close the panel and notify parent to refresh contacts list
      onClosePanel();
      onContactDeleted?.();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete contact. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const loadContactGroups = async (contactId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/contacts/${contactId}/groups`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const groups = await res.json();
        setContactGroups(groups.map((g: any) => g.id));
      }
    } catch (error) {
      console.error("Failed to load contact groups:", error);
      setContactGroups([]);
    }
  };

  const loadInteractions = async (contactId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/interactions/${contactId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setInteractions(data);
      }
    } catch (error) {
      console.error("Failed to load interactions:", error);
      setInteractions([]);
    }
  };

  const handleSaveInteraction = async (interaction: Omit<Interaction, "id">) => {
    const token = localStorage.getItem("token");
    if (!token || !selectedContact?.id) return;

    const method = editingInteraction ? "PATCH" : "POST";
    const url = editingInteraction
      ? `http://127.0.0.1:8000/interactions/${editingInteraction.id}`
      : "http://127.0.0.1:8000/interactions/";

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(interaction),
    });

    if (res.ok) {
      await loadInteractions(selectedContact.id);
      setEditingInteraction(null);
    } else {
      throw new Error("Failed to save interaction");
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    const token = localStorage.getItem("token");
    if (!token || !selectedContact?.id) return;

    const res = await fetch(`http://127.0.0.1:8000/interactions/${interactionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      await loadInteractions(selectedContact.id);
    }
  };

  const handleEditInteraction = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    setIsInteractionModalOpen(true);
  };

  const handleOpenInteractionsTab = () => {
    if (selectedContact?.id) {
      window.open(`/interactions?contactId=${selectedContact.id}`, "_blank");
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing && selectedContact) {
      setEditForm(selectedContact);
      setSelectedGroups([...contactGroups]);
    }
  };

  const handleUpdateContact = async () => {
    if (!selectedContact?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setIsUpdating(true);

    try {
      const updateData = {
        ...editForm,
        groups: selectedGroups,
      };

      const res = await fetch(
        `http://127.0.0.1:8000/contacts/${selectedContact.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update contact");
      }

      const updatedContact = await res.json();
      onContactUpdate(updatedContact);
      setContactGroups([...selectedGroups]);
      setIsEditing(false);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update contact. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGroupCreated = (newGroup: any) => {
    setAvailableGroups([...availableGroups, newGroup]);
    setSelectedGroups([...selectedGroups, newGroup.id]);
  };

  const toggleGroupSelection = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter((id) => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const getGroupById = (groupId: string) => {
    return availableGroups.find((g) => g.id === groupId);
  };

  const handleClosePanel = () => {
    // Cancel edit mode if currently editing
    if (isEditing) {
      setIsEditing(false);
      // Reset form to original contact data
      if (selectedContact) {
        setEditForm(selectedContact);
        setSelectedGroups([...contactGroups]);
      }
    }
    // Close the panel
    onClosePanel();
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const nameLength = 10;
    const truncatedName =
      groupName.length > nameLength
        ? groupName.slice(0, nameLength) + "…"
        : groupName;

    const confirmed = window.confirm(
      `Are you sure you want to delete the group "${truncatedName}"? This action is irreversible and will remove the group from all contacts.`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Remove the group from available groups
        setAvailableGroups(availableGroups.filter((g) => g.id !== groupId));
        // Remove the group from selected groups if it was selected
        setSelectedGroups(selectedGroups.filter((id) => id !== groupId));
        // Remove the group from contact groups if it was assigned
        setContactGroups(contactGroups.filter((id) => id !== groupId));
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to delete group");
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert("Network error. Please try again.");
    }
  };

  if (!selectedContact) return null;

  return (
    <>
      <div
        style={{ width: `${panelWidthPct}vw` }} // vw = viewport width
        className={`fixed top-0 right-0 h-full bg-base-200 border-l border-base-300 shadow-xl transform transition-transform duration-300 z-50 ${isPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Resizer */}
        <div
          onMouseDown={onMouseDown}
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-gray-300 hover:bg-gray-400 z-50"
        />

        <div className="h-full flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between p-6 border-b border-base-300">
            <h2 className="text-xl font-bold text-base-content">
              Contact Details
            </h2>
            <button
              onClick={handleClosePanel}
              className="text-base-content opacity-70 hover:opacity-100 hover:bg-base-300 rounded-full p-2 transition-all"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-neutral text-primary-content rounded-full flex flex-shrink-0 items-center justify-center text-2xl font-bold">
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  style={{
                    maxWidth:
                      (panelWidthPct / 100) * window.innerWidth - 180 - 112, // viewport width fraction minus avatar & button widths
                  }}
                  className="text-2xl font-bold text-base-content truncate"
                >
                  {selectedContact.name}
                </h3>
                <div
                  className="text-base-content opacity-70 space-y-1"
                  style={{
                    maxWidth:
                      (panelWidthPct / 100) * window.innerWidth - 180 - 112, // same as name
                  }}
                >
                  <p className="truncate">{selectedContact.current_role || "No role specified"}</p>
                  {selectedContact.company && (
                    <div className="flex items-center space-x-1 min-w-0">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="truncate min-w-0">{selectedContact.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit/Save buttons */}
              <div className="flex flex-col items-end w-28 flex-shrink-0 space-y-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={handleEditToggle}
                      className="px-3 py-2 bg-accent text-accent-content rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
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
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isDeleting}
                      className="px-3 py-2 bg-error text-error-content rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
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
                          strokeWidth="2"
                          d="M19 7L5 7M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"
                        />
                      </svg>
                      <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleUpdateContact}
                      disabled={isUpdating || isDeleting}
                      className="px-3 py-2 bg-success text-success-content rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
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
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{isUpdating ? "Saving..." : "Save"}</span>
                    </button>
                    <button
                      onClick={handleEditToggle}
                      disabled={isUpdating || isDeleting}
                      className="px-3 py-2 bg-base-300 text-base-content rounded-lg hover:bg-base-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Contact Fields */}
              {/* Name Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    maxLength={100}
                    className="w-full p-3 pr-18 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter name"
                  />
                ) : (
                  <div
                    className="w-full pr-18 p-3 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {editForm.name}
                  </div>
                )}
                {isEditing && (
                  <span className="absolute right-3 top-2/3 transform -translate-y-1/2 text-sm text-base-content opacity-70">
                    {editForm.name.length} / 100
                  </span>
                )}
              </div>

              {/* Email Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    maxLength={100}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full p-3 pr-18 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter email address"
                  />
                ) : (
                  <div
                    className="w-full p-3 pr-18 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {editForm.email}
                  </div>
                )}
                {isEditing && (
                  <span className="absolute right-3 top-2/3 transform -translate-y-1/2 text-sm text-base-content opacity-70">
                    {editForm.email.length} / 100
                  </span>
                )}
              </div>

              {/* Phone Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    maxLength={20}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="w-full p-3 pr-16 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div
                    className="w-full p-3 pr-16 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {editForm.phone}
                  </div>
                )}
                {isEditing && (
                  <span className="absolute right-3 top-2/3 transform -translate-y-1/2 text-sm text-base-content opacity-70">
                    {editForm.phone.length} / 20
                  </span>
                )}
              </div>

              {/* Importance Slider */}
              <div>
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Importance
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={editForm.importance || 1}
                      onChange={(e) =>
                        setEditForm({ ...editForm, importance: parseInt(e.target.value) })
                      }
                      className="w-full h-2 bg-base-300 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-base-content opacity-70">
                      <span className={editForm.importance === 1 ? "font-bold text-base-content" : ""}>1 - Low</span>
                      <span className={editForm.importance === 2 ? "font-bold text-base-content" : ""}>2</span>
                      <span className={editForm.importance === 3 ? "font-bold text-base-content" : ""}>3 - Medium</span>
                      <span className={editForm.importance === 4 ? "font-bold text-base-content" : ""}>4</span>
                      <span className={editForm.importance === 5 ? "font-bold text-base-content" : ""}>5 - High</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default">
                      {selectedContact.importance ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{selectedContact.importance}</span>
                          <span>-</span>
                          <span>
                            {selectedContact.importance === 1 && "Low"}
                            {selectedContact.importance === 2 && "Below Average"}
                            {selectedContact.importance === 3 && "Medium"}
                            {selectedContact.importance === 4 && "Above Average"}
                            {selectedContact.importance === 5 && "High"}
                          </span>
                        </div>
                      ) : (
                        "1 - Low"
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Company Field with Icon */}
              <div className="relative">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Company
                </label>
                {isEditing ? (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content opacity-50">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={editForm.company || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, company: e.target.value })
                      }
                      maxLength={100}
                      className="w-full pl-11 pr-18 p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. Acme Corp"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-base-content opacity-70">
                      {(editForm.company?.length ?? 0)} / 100
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content opacity-50">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div
                      className="w-full pl-11 p-3 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default"
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      {selectedContact.company || "No company specified"}
                    </div>
                  </div>
                )}
              </div>

              {/* Current Role Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Current Role
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.current_role || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, current_role: e.target.value })
                    }
                    maxLength={100}
                    className="w-full p-3 pr-18 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Software Engineer"
                  />
                ) : (
                  <div
                    className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {selectedContact.current_role || "No role specified"}
                  </div>
                )}
                {isEditing && (
                  <span className="absolute right-3 top-2/3 transform -translate-y-1/2 text-sm text-base-content opacity-70">
                    {(editForm.current_role?.length ?? 0)} / 100
                  </span>
                )}
              </div>



              {/* Location Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.location || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                    maxLength={100}
                    className="w-full p-3 pr-18 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. San Francisco, CA"
                  />
                ) : (
                  <div
                    className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {selectedContact.location || "No location specified"}
                  </div>
                )}
                {isEditing && (
                  <span className="absolute right-3 top-2/3 transform -translate-y-1/2 text-sm text-base-content opacity-70">
                    {(editForm.location?.length ?? 0)} / 100
                  </span>
                )}
              </div>



              {/* Notes Field */}
              <div className="flex flex-col relative">
                <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                  Notes
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    rows={4}
                    maxLength={500}
                    className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Enter notes (optional)"
                  />
                ) : (
                  <div
                    className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content cursor-default min-h-[112px]"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {selectedContact.notes || "No notes provided"}
                  </div>
                )}
                {isEditing && (
                  <span className="self-end text-sm text-base-content opacity-70 mt-1">
                    {(editForm.notes?.length ?? 0)} / 500
                  </span>
                )}
              </div>



              {/* Groups Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-base-content opacity-70">
                    Groups
                  </label>
                  {isEditing && (
                    <button
                      onClick={() => setShowGroupCreator(true)}
                      className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-primary/10 text-primary hover:bg-primary hover:text-primary-content"
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
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <span>New Group</span>
                    </button>
                  )}
                </div>

                {/* Group Tags */}
                <div className="space-y-3">
                  {/* Current Groups (Read-only) */}
                  {!isEditing && (
                    <div className="flex flex-wrap gap-2">
                      {contactGroups.length > 0 ? (
                        contactGroups.map((groupId) => {
                          const group = getGroupById(groupId);
                          return group ? (
                            <span
                              key={groupId}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white max-w-32 truncate overflow-hidden whitespace-nowrap"
                              style={{ backgroundColor: group.color }}
                              title={group.name}
                            >
                              <span className="truncate max-w-32 block">
                                {group.name}
                              </span>
                            </span>
                          ) : null;
                        })
                      ) : (
                        <p className="text-base-content opacity-50 text-sm">
                          No groups assigned
                        </p>
                      )}
                    </div>
                  )}

                  {/* Editable Groups */}
                  {isEditing && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {availableGroups
                          .sort((a, b) => {
                            const aSelected = selectedGroups.includes(a.id);
                            const bSelected = selectedGroups.includes(b.id);
                            if (aSelected && !bSelected) return -1;
                            if (!aSelected && bSelected) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map((group) => (
                            <div
                              key={group.id}
                              className="relative inline-flex items-center"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroup(group.id, group.name);
                                }}
                                className="absolute left-1 z-10 p-0.5 hover:bg-black/20 rounded-full"
                                title={`Delete ${group.name}`}
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => toggleGroupSelection(group.id)}
                                className={`inline-flex items-center pl-6 pr-3 py-1 rounded-full text-sm font-medium transition-all max-w-32 ${selectedGroups.includes(group.id)
                                  ? "text-white ring-2 ring-base-content"
                                  : "text-white opacity-50 hover:opacity-75"
                                  }`}
                                style={{ backgroundColor: group.color }}
                                title={group.name}
                              >
                                <span className="truncate">{group.name}</span>
                                {selectedGroups.includes(group.id) && (
                                  <svg
                                    className="w-4 h-4 ml-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          ))}
                      </div>
                      {availableGroups.length === 0 && (
                        <p className="text-base-content opacity-50 text-sm">
                          No groups available. Create one above!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Separator between Groups and Interactions */}
                {!isEditing && (
                  <hr className="my-6 border-base-300" />
                )}

                {/* Interactions Section - Hidden in edit mode */}
                {!isEditing && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-base-content opacity-70">
                        Interactions
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsInteractionModalOpen(true)}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-primary/10 text-primary hover:bg-primary hover:text-primary-content"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add</span>
                        </button>
                        <button
                          onClick={handleOpenInteractionsTab}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-base-300 text-base-content hover:bg-base-100"
                          title="Open in new tab"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Open</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-base-100 border border-base-300 rounded-lg p-3">
                      <InteractionTimeline
                        interactions={interactions.slice(0, 3)}
                        onEdit={handleEditInteraction}
                        onDelete={handleDeleteInteraction}
                        compact={true}
                      />
                      {interactions.length > 3 && (
                        <div className="text-center mt-3 pt-3 border-t border-base-300">
                          <button
                            onClick={handleOpenInteractionsTab}
                            className="text-sm text-base-content opacity-70 hover:opacity-100 transition-opacity"
                          >
                            +{interactions.length - 3} more interaction{interactions.length - 3 !== 1 ? 's' : ''}...
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Similar Contacts Section - Hidden in edit mode */}
                {!isEditing && selectedContact?.id && (
                  <div className="mt-6">
                    <SimilarContactsSection
                      contactId={selectedContact.id}
                      contactName={selectedContact.name}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal - Now outside the positioned panel */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-base-100 bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-300 p-6 rounded-xl shadow-2xl relative w-96 max-w-full">
            <h3 className="text-lg font-bold mb-4">Delete Contact</h3>
            <p className="mb-6">
              Are you sure you want to delete{" "}
              {selectedContact?.name.length > 25
                ? selectedContact?.name.slice(0, 25) + "…"
                : selectedContact?.name}
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-base-300 rounded-lg hover:bg-base-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                disabled={isDeleting}
                className="px-4 py-2 bg-error text-error-content rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Creator Popup - Now outside the positioned panel */}
      <GroupCreator
        isOpen={showGroupCreator}
        onClose={() => setShowGroupCreator(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Interaction Modal */}
      {selectedContact?.id && (
        <InteractionModal
          isOpen={isInteractionModalOpen}
          onClose={() => {
            setIsInteractionModalOpen(false);
            setEditingInteraction(null);
          }}
          onSave={handleSaveInteraction}
          contactId={selectedContact.id}
          contactName={selectedContact.name}
          editingInteraction={editingInteraction}
        />
      )}
    </>
  );
}
