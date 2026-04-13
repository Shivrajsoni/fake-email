"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Check,
  ArrowLeft,
  Mail,
  RefreshCw,
} from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { pollInbox, type ReceivedEmail } from "@/lib/backend";
import { EmailView } from "@/components/ui/email-view";

const POLL_INTERVAL_MS = 10_000;

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EmailsPage() {
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [tempAddress, setTempAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextSinceRef = useRef<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(
    null,
  );
  const [isCopied, setIsCopied] = useState(false);

  const fetchEmails = useCallback(
    async (address: string, since: string | null) => {
      try {
        const data = await pollInbox(address, since);
        setEmails((prev) => {
          if (since == null) return data.messages;
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const message of data.messages) {
            if (!seen.has(message.id)) merged.unshift(message);
          }
          return merged;
        });
        nextSinceRef.current = data.next_since;
        setError(null);
      } catch (err: unknown) {
        setError(errorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const address = sessionStorage.getItem("temp_address");
    setTempAddress(address);

    if (!address) {
      setError("No temporary address found. Please generate one first.");
      setIsLoading(false);
      return;
    }

    void fetchEmails(address, null);
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      void fetchEmails(address, nextSinceRef.current);
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) void fetchEmails(address, nextSinceRef.current);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchEmails]);

  const handleCopy = () => {
    if (!tempAddress) return;
    navigator.clipboard.writeText(tempAddress);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <>
      <main className="min-h-dvh px-4 sm:px-8 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.header
            className="mb-8 sm:mb-10"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
                INBOX
              </h1>
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-smoke hover:text-ink transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                New address
              </Link>
            </div>

            {tempAddress && (
              <motion.div
                className="flex items-center gap-3 p-4 border-2 border-ink bg-paper"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-smoke font-semibold mb-1">
                    Your address
                  </p>
                  <p className="font-mono text-sm sm:text-base text-ink truncate">
                    {tempAddress}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="shrink-0 h-10 w-10 flex items-center justify-center border-2 border-ink hover:bg-ink hover:text-page transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion"
                  aria-label="Copy email address"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-vermillion" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </motion.div>
            )}
          </motion.header>

          {/* Content */}
          <section aria-label="Email messages">
            {isLoading ? (
              <motion.div
                className="flex items-center justify-center py-24"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <RefreshCw className="w-5 h-5 text-smoke animate-spin" />
                <span className="ml-3 text-smoke text-sm font-medium">
                  Loading inbox&hellip;
                </span>
              </motion.div>
            ) : error ? (
              <motion.div
                className="py-16 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-vermillion font-medium mb-4" role="alert">
                  {error}
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline underline-offset-4 decoration-chalk hover:decoration-ink transition-colors"
                >
                  Generate a new address
                </Link>
              </motion.div>
            ) : emails.length === 0 ? (
              <motion.div
                className="py-20 text-center border-2 border-dashed border-chalk"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Mail
                  className="w-10 h-10 text-chalk mx-auto mb-4"
                  aria-hidden="true"
                />
                <p className="text-ink font-display font-bold text-lg">
                  No emails yet
                </p>
                <p className="text-smoke text-sm mt-2 max-w-xs mx-auto">
                  Send something to your address &mdash; it will appear here
                  automatically.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ash">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Checking every 10 seconds
                </div>
              </motion.div>
            ) : (
              <motion.ul
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
              >
                <AnimatePresence mode="popLayout">
                  {emails.map((email) => (
                    <motion.li
                      key={email.id}
                      layout
                      variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.4 },
                        },
                      }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      onClick={() => setSelectedEmail(email)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedEmail(email);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="group relative bg-paper border-2 border-chalk hover:border-ink p-4 sm:p-5 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 bg-vermillion opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        aria-hidden="true"
                      />

                      <div className="flex items-baseline justify-between gap-4 mb-1.5">
                        <p className="font-mono text-xs text-smoke truncate">
                          {email.from_addr || "unknown sender"}
                        </p>
                        <time className="text-[11px] text-ash shrink-0 tabular-nums">
                          {formatTime(email.received_at)}
                        </time>
                      </div>
                      <p className="font-display font-semibold text-ink truncate text-[15px] leading-snug">
                        {email.subject || "(no subject)"}
                      </p>
                      {email.body_text && (
                        <p className="text-sm text-smoke mt-1.5 truncate leading-relaxed">
                          {email.body_text}
                        </p>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </section>
        </div>
      </main>

      <AnimatePresence>
        {selectedEmail && (
          <EmailView
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
