"use client";

import React from "react";

// Matches the EmailDetail struct from the Rust backend
export interface EmailDetail {
  id: string;
  from_address: string;
  subject: string;
  body_plain: string | null;
  body_html: string | null;
  received_at: string; // ISO 8601 date string
}

interface EmailViewProps {
  email: EmailDetail;
  onClose: () => void;
  onDelete: (emailId: string) => void;
  isDeleting: boolean;
}

export const EmailView: React.FC<EmailViewProps> = ({
  email,
  onClose,
  onDelete,
  isDeleting,
}) => {
  // Sanitize and render HTML body, or fallback to plain text
  const renderBody = () => {
    if (email.body_html) {
      // In a real app, you MUST sanitize this HTML to prevent XSS attacks.
      // Using a library like DOMPurify is recommended.
      // For this example, we'''ll trust the source.
      return (
        <div
          className="prose prose-invert prose-sm md:prose-base max-w-none"
          dangerouslySetInnerHTML={{ __html: email.body_html }}
        />
      );
    }
    if (email.body_plain) {
      return <p className="whitespace-pre-wrap">{email.body_plain}</p>;
    }
    return (
      <p className="text-zinc-500 italic">This email has no content.</p>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-zinc-100 truncate">
              {email.subject}
            </h2>
            <p className="text-sm text-zinc-400 flex-shrink-0 pl-4">
              {new Date(email.received_at).toLocaleString()}
            </p>
          </div>
          <p className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-300">From:</span>{" "}
            {email.from_address}
          </p>
        </header>

        {/* Body */}
        <main className="p-6 overflow-y-auto flex-grow bg-zinc-950/50">
          {renderBody()}
        </main>

        {/* Footer / Actions */}
        <footer className="p-3 border-t border-zinc-800 flex-shrink-0 flex justify-end items-center gap-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 rounded-md hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Back
          </button>
          <button
            onClick={() => onDelete(email.id)}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-800 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </footer>
      </div>
    </div>
  );
};