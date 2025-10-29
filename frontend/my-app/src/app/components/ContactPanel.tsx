"use client";
import { useState, useEffect } from "react";

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
}

const PRESET_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Red", value: "#EF4444" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Teal", value: "#14B8A6" },
];

export default function ContactPanel({ 
  selectedContact, 
  isPanelOpen, 
  onClosePanel, 
  onContactUpdate 
}: ContactPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState<Contact>({ name: "", email: "", phone: "", notes: "" });
  
  // Group-related state
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [contactGroups, setContactGroups] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0].value);

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

  const loadContactGroups = async (contactId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/contacts/${contactId}/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

      const res = await fetch(`http://127.0.0.1:8000/contacts/${selectedContact.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/groups/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newGroupName,
          color: newGroupColor,
        }),
      });

      if (res.ok) {
        const response = await res.json();
        const newGroup = response[0]; // Backend returns array
        setAvailableGroups([...availableGroups, newGroup]);
        setSelectedGroups([...selectedGroups, newGroup.id]);
        setNewGroupName("");
        setNewGroupColor(PRESET_COLORS[0].value);
        setShowGroupCreator(false);
      }
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const getGroupById = (groupId: string) => {
    return availableGroups.find(g => g.id === groupId);
  };

  if (!selectedContact) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-base-200 border-l border-base-300 shadow-xl transform transition-transform duration-300 z-40 ${
        isPanelOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Panel header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-xl font-bold text-base-content">Contact Details</h2>
          <button
            onClick={onClosePanel}
            className="text-base-content opacity-70 hover:opacity-100 hover:bg-base-300 rounded-full p-2 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
              <h3 className="text-2xl font-bold text-base-content">{selectedContact.name}</h3>
              <p className="text-base-content opacity-70">Contact Information</p>
            </div>

            {/* Edit/Save buttons */}
            <div className="flex space-x-2">
              {!isEditing ? (
                <button
                  onClick={handleEditToggle}
                  className="px-3 py-2 bg-primary text-primary-content rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleUpdateContact}
                    disabled={isUpdating}
                    className="px-3 py-2 bg-success text-success-content rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{isUpdating ? "Saving..." : "Save"}</span>
                  </button>
                  <button
                    onClick={handleEditToggle}
                    disabled={isUpdating}
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
              <label className="block text-sm font-medium text-base-content opacity-70 mb-2">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter name"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                  <p className="text-base-content">{selectedContact.name || "No name provided"}</p>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-base-content opacity-70 mb-2">Email Address</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter email address"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                  <p className="text-base-content">{selectedContact.email || "No email provided"}</p>
                </div>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-base-content opacity-70 mb-2">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg">
                  <p className="text-base-content">{selectedContact.phone || "No phone number provided"}</p>
                </div>
              )}
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-sm font-medium text-base-content opacity-70 mb-2">Notes</label>
              {isEditing ? (
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                  className="w-full p-3 bg-base-100 border border-base-300 rounded-lg text-base-content focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Enter notes (optional)"
                />
              ) : (
                <div className="p-3 bg-base-100 border border-base-300 rounded-lg min-h-[100px]">
                  <p className="text-base-content whitespace-pre-wrap">{selectedContact.notes || "No notes provided"}</p>
                </div>
              )}
            </div>

            {/* Groups Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-base-content opacity-70">Groups</label>
                {isEditing && (
                  <button
                    onClick={() => setShowGroupCreator(!showGroupCreator)}
                    className="text-sm text-primary hover:text-primary-content hover:bg-primary px-2 py-1 rounded transition-colors"
                  >
                    + New Group
                  </button>
                )}
              </div>

              {/* Group Creator */}
              {isEditing && showGroupCreator && (
                <div className="mb-4 p-4 bg-base-100 border border-base-300 rounded-lg">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full p-2 bg-base-200 border border-base-300 rounded text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-base-content">Color:</span>
                      <div className="flex space-x-1">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setNewGroupColor(color.value)}
                            className={`w-6 h-6 rounded-full border-2 ${
                              newGroupColor === color.value ? "border-base-content" : "border-base-300"
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateGroup}
                        disabled={!newGroupName.trim()}
                        className="px-3 py-1 bg-primary text-primary-content rounded text-sm hover:opacity-90 disabled:opacity-50"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowGroupCreator(false);
                          setNewGroupName("");
                          setNewGroupColor(PRESET_COLORS[0].value);
                        }}
                        className="px-3 py-1 bg-base-300 text-base-content rounded text-sm hover:bg-base-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: group.color }}
                          >
                            {group.name}
                          </span>
                        ) : null;
                      })
                    ) : (
                      <p className="text-base-content opacity-50 text-sm">No groups assigned</p>
                    )}
                  </div>
                )}

                {/* Editable Groups */}
                {isEditing && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {availableGroups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => toggleGroupSelection(group.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            selectedGroups.includes(group.id)
                              ? "text-white ring-2 ring-base-content"
                              : "text-white opacity-50 hover:opacity-75"
                          }`}
                          style={{ backgroundColor: group.color }}
                        >
                          {group.name}
                          {selectedGroups.includes(group.id) && (
                            <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                    {availableGroups.length === 0 && (
                      <p className="text-base-content opacity-50 text-sm">No groups available. Create one above!</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}