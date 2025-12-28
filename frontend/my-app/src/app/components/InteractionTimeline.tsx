"use client";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Interaction {
  id: string;
  type: "email" | "call" | "dm" | "meet" | "other";
  direction: "inbound" | "outbound";
  happened_at: string;
  notes?: string;
  created_at?: string;
}

interface InteractionTimelineProps {
  interactions: Interaction[];
  onEdit?: (interaction: Interaction) => void;
  onDelete?: (interactionId: string) => void;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  email: "📧",
  call: "📞",
  dm: "💬",
  meet: "🤝",
  other: "⭐",
};

const TYPE_LABELS: Record<string, string> = {
  email: "Email",
  call: "Call",
  dm: "Direct Message",
  meet: "Meeting",
  other: "Other",
};

export default function InteractionTimeline({
  interactions,
  onEdit,
  onDelete,
  compact = false,
}: InteractionTimelineProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleNotes = (id: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  if (interactions.length === 0) {
    return (
      <div className="text-center py-8 text-base-content opacity-70">
        <p className="text-sm">No interactions yet</p>
        <p className="text-xs mt-1">Add your first interaction to get started</p>
      </div>
    );
  }

  const displayInteractions = compact ? interactions.slice(0, 5) : interactions;

  return (
    <div className="space-y-3">
      {displayInteractions.map((interaction, index) => {
        const isExpanded = expandedNotes.has(interaction.id);
        const hasNotes = interaction.notes && interaction.notes.trim().length > 0;
        const truncatedNotes = hasNotes && interaction.notes!.length > 100
          ? interaction.notes!.substring(0, 100) + "..."
          : interaction.notes;

        return (
          <div
            key={interaction.id}
            className="relative pl-8 pb-4 border-l-2 border-base-300 last:border-l-0"
          >
            {/* Timeline dot */}
            <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-base-200" />

            {/* Interaction card */}
            <div className="bg-base-100 border border-base-300 rounded-lg p-3 hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Type icon */}
                  <span className="text-2xl flex-shrink-0">
                    {TYPE_ICONS[interaction.type]}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Type and direction */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-base-content">
                        {TYPE_LABELS[interaction.type]}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-base-200 text-base-content">
                        {interaction.direction === "inbound" ? "← Inbound" : "→ Outbound"}
                      </span>
                    </div>

                    {/* Date */}
                    <p className="text-xs text-base-content opacity-70 mt-1">
                      {formatDate(interaction.happened_at)}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(interaction)}
                        className="p-1.5 hover:bg-base-200 rounded transition-colors"
                        title="Edit interaction"
                      >
                        <svg
                          className="w-4 h-4 text-base-content opacity-70"
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
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm("Delete this interaction?")) {
                            onDelete(interaction.id);
                          }
                        }}
                        className="p-1.5 hover:bg-error hover:text-error-content rounded transition-colors"
                        title="Delete interaction"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              {hasNotes && (
                <div className="mt-2 pt-2 border-t border-base-300">
                  <p className="text-sm text-base-content whitespace-pre-wrap">
                    {isExpanded ? interaction.notes : truncatedNotes}
                  </p>
                  {interaction.notes!.length > 100 && (
                    <button
                      onClick={() => toggleNotes(interaction.id)}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {compact && interactions.length > 5 && (
        <p className="text-xs text-center text-base-content opacity-70 pt-2">
          Showing 5 of {interactions.length} interactions
        </p>
      )}
    </div>
  );
}
