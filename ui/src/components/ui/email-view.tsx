"use client";

import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

export interface EmailPayload {
  id: string;
  from_addr: string;
  subject: string;
  body_text: string | null;
  received_at: string;
}

interface EmailViewProps {
  email: EmailPayload;
  onClose: () => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

export const EmailView: React.FC<EmailViewProps> = ({ email, onClose }) => {
  const formattedDate = new Date(email.received_at).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close email"
      />

      {/* Card with hard shadow */}
      <motion.article
        className="relative bg-page border-2 border-ink w-full max-w-2xl max-h-[85vh] flex flex-col"
        style={{ boxShadow: "8px 8px 0 0 var(--color-ink)" }}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.25, ease }}
      >
        {/* Header */}
        <header className="p-5 sm:p-6 border-b-2 border-chalk shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-ink leading-tight mb-3">
                {email.subject || "(no subject)"}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                <p className="text-smoke">
                  <span className="font-semibold text-ink">From</span>{" "}
                  <span className="font-mono text-xs">
                    {email.from_addr || "unknown"}
                  </span>
                </p>
                <time className="text-ash text-xs">{formattedDate}</time>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-10 h-10 flex items-center justify-center border-2 border-ink hover:bg-ink hover:text-page transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion"
              aria-label="Close email"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {email.body_text ? (
            <div className="text-[15px] leading-[1.8] text-ink whitespace-pre-wrap wrap-break-word">
              {email.body_text}
            </div>
          ) : (
            <p className="text-smoke italic text-sm">
              This email has no body content.
            </p>
          )}
        </div>
      </motion.article>
    </motion.div>
  );
};
