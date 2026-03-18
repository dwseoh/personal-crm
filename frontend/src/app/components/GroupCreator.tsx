"use client";
import { useState } from "react";

const PRESET_COLORS = [
  "#4285F4",
  "#DB4437",
  "#F4B400",
  "#0F9D58",
  "#AB47BC",
  "#FF7043",
  "#00ACC1",
  "#9E9E9E",
  "#795548",
  "#607D8B",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#2196F3",
];

interface GroupCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: any) => void;
}

export default function GroupCreator({
  isOpen,
  onClose,
  onGroupCreated,
}: GroupCreatorProps) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/groups/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription,
          color: selectedColor,
        }),
      });

      if (res.ok) {
        const response = await res.json();
        const newGroup = response[0]; // Backend returns array
        onGroupCreated(newGroup);

        // Reset form
        setGroupName("");
        setGroupDescription("");
        setSelectedColor(PRESET_COLORS[0]);
        onClose();
      } else {
        const errorData = await res.json();
        setError(errorData.detail || "Failed to create group");
      }
    } catch (error) {
      console.error("Failed to create group:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setGroupDescription("");
    setSelectedColor(PRESET_COLORS[0]);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-base-100 bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-base-100 border border-base-300 p-6 rounded-xl shadow-2xl relative w-96 max-w-full max-h-[90vh] overflow-y-auto mx-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-base-content opacity-70 hover:opacity-100 hover:bg-base-200 rounded-full p-1 transition-all"
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

        {/* Header */}
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-base-content">
            Create New Group
          </h2>
        </div>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-2">
              Group Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter group name (e.g., Family, Work, Friends)"
              className="w-full p-3 bg-base-200 border border-base-300 rounded-lg text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              maxLength={50}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-base-content/50">
                {groupName.length}/50 characters
              </span>
            </div>
          </div>

          { /* Group Description Input */ }
          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-2 pt-2">
              Description 
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => {
                setGroupDescription(e.target.value);
                if (error) setError("");
              }}
              rows={4}
              placeholder="Enter a description (optional)"
              className="w-full p-3 bg-base-200 border border-base-300 rounded-lg text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              maxLength={200}
            />

            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-base-content/200 max-h-[4.5rem] overflow-y-auto">
                {groupDescription.length}/200 characters
              </span>
            </div>


          </div>



          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-3 pt-2">
              Choose Color
            </label>

            {/* Preset Colors Grid */}
            <div className="grid grid-cols-5 gap-y-1 gap-x-0 ml-8.5 mr-8.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-3 transition-all hover:scale-110 ${
                    selectedColor === color
                      ? "border-white shadow-lg ring-2 ring-primary"
                      : "border-base-300 hover:border-base-content/50"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-error flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={!groupName.trim() || isCreating}
              className="flex-1 px-4 py-3 bg-primary text-primary-content rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isCreating ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
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
                  <span>Create Group</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-3 bg-base-300 text-base-content rounded-lg font-medium hover:bg-base-200 disabled:opacity-50 transition-all flex items-center justify-center"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
