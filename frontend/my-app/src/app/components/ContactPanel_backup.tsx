"use client";
import { useState, useEffect } from "react";
import GroupCreator from "./GroupCreator";
import { useRouter } from "next/navigation";

interface Contact {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

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
}

export default function ContactPanel({
  selectedContact,
  isPanelOpen,
  onClosePanel,
  onContactUpdate,
  onContactDeleted,
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
  });

  // Group-related state
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [contactGroups, setContactGroups] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showGroupCreator, setShowGroupCreator] = useState(false);

  // Load groups and contact groups when contact changes
  useEffect(() => {
    if (selectedContact?.id) {
      loadAvailableGroups();
      loadContactGroups(selectedContact.id);
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
    const confirmed = window.confirm(
      `Are you sure you want to delete the group "${groupName}"? This action is irreversible and will remove the group from all contacts.`
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
        setAvailableGroups(availableGroups.filter(g => g.id !== groupId));
        // Remove the group from selected groups if it was selected
        setSelectedGroups(selectedGroups.filter(id => id !== groupId));
        // Remove the group from contact groups if it was assigned
        setContactGroups(contactGroups.filter(id => id !== groupId));
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
        className={`fixed top-0 right-0 h-full w-96 bg-base-200 border-l border-base-300 shadow-xl transform transition-transform duration-300 z-50 ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
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
            <div className="w-20 h-20 bg-primary text-primary-content rounded-full flex items-center justify-center text-2xl font-bold">
              {selectedContact.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-base-content">
                {selectedContact.name}
              </h3>
              <p className="text-base-content opacity-70">
                Contact Information
              </p>
            </div>

            {/* Edit/Save buttons */}
                <div className="flex space-x-2">
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
            <div>
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
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter name"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                  <p className="text-base-content">
                    {selectedContact.name || "No name provided"}
                  </p>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter email address"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                  <p className="text-base-content">
                    {selectedContact.email || "No email provided"}
                  </p>
                </div>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-base-content opacity-70 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                  <p className="text-base-content">
                    {selectedContact.phone || "No phone number provided"}
                  </p>
                </div>
              )}
            </div>

            {/* Notes Field */}
            <div>
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
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Enter notes (optional)"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg min-h-[100px]">
                  <p className="text-base-content whitespace-pre-wrap">
                    {selectedContact.notes || "No notes provided"}
                  </p>
                </div>
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
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white max-w-32 truncate"
                            style={{ backgroundColor: group.color }}
                            title={group.name}
                          >
                            {group.name}
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
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleGroupSelection(group.id)}
                            className={`inline-flex items-center pl-6 pr-3 py-1 rounded-full text-sm font-medium transition-all max-w-32 ${
                              selectedGroups.includes(group.id)
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
            </div>
          </div>
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-base-100 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-base-100 border border-base-300 p-6 rounded-xl shadow-xl relative w-96 max-w-[90vw]">
              <h3 className="text-lg font-bold mb-4">Delete Contact</h3>
              <p className="mb-6">
                Are you sure you want to delete {selectedContact?.name}? This action cannot be undone.
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


      </div>

      </div>

      {/* Group Creator Popup - Now outside the positioned panel */}
      <GroupCreator
        isOpen={showGroupCreator}
        onClose={() => setShowGroupCreator(false)}
        onGroupCreated={handleGroupCreated}
      />
    </>
  );
}
