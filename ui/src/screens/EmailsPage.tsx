"use client";

import { Cover } from "@/components/ui/cover";
import { EmailView } from "@/components/ui/email-view";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { errorMessage } from "@/lib/errors";
import { pollInbox, type ReceivedEmail } from "@/lib/backend";

const POLL_INTERVAL_MS = 10_000;

export function EmailsPage() {
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [tempAddress, setTempAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextSinceRef = useRef<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null);
  const [isViewing, setIsViewing] = useState(false);

  const [isCopied, setIsCopied] = useState(false);

  const fetchEmails = useCallback(async (address: string, since: string | null) => {
    try {
      const data = await pollInbox(address, since);
      setEmails((prev) => {
        if (since == null) {
          return data.messages;
        }
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const message of data.messages) {
          if (!seen.has(message.id)) {
            merged.unshift(message);
          }
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
  }, []);

  useEffect(() => {
    const address = sessionStorage.getItem("temp_address");
    setTempAddress(address);

    if (!address) {
      setError("No temporary address found. Please generate a new one.");
      setIsLoading(false);
      return;
    }

    void fetchEmails(address, null);
    const intervalId = setInterval(() => {
      if (document.hidden) {
        return;
      }
      void fetchEmails(address, nextSinceRef.current);
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) {
        void fetchEmails(address, nextSinceRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchEmails]);

  const handleEmailClick = (email: ReceivedEmail) => {
    setIsViewing(true);
    setSelectedEmail(email);
  };

  const handleCloseView = () => {
    setIsViewing(false);
    setSelectedEmail(null);
  };

  const handleCopyAddress = () => {
    if (tempAddress) {
      navigator.clipboard.writeText(tempAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1000);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-zinc-400">Loading your inbox...</p>;
    }
    if (error) {
      return (
        <div className="space-y-4">
          <p className="text-red-500">{error}</p>
          <Link
            href="/"
            className="inline-flex text-sm font-medium text-zinc-300 underline underline-offset-4 hover:text-white"
          >
            Back to home to generate an address
          </Link>
        </div>
      );
    }
    if (emails.length === 0) {
      return (
        <div className="text-center border border-dashed border-zinc-700 rounded-lg p-12">
          <p className="text-zinc-400">No emails received yet.</p>
          <p className="text-zinc-500 text-sm mt-2">
            Waiting for new mail... this page will automatically refresh.
          </p>
        </div>
      );
    }
    return (
      <ul className="space-y-3 w-full">
        {emails.map((email) => (
          <li
            key={email.id}
            onClick={() => handleEmailClick(email)}
            className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-baseline">
              <p className="font-semibold text-zinc-200">
                {email.from_addr}
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(email.received_at).toLocaleString()}
              </p>
            </div>
            <p className="text-zinc-300 mt-2 truncate font-medium">
              {email.subject}
            </p>
            {email.body_text && (
              <p className="text-sm text-zinc-500 mt-1 truncate">
                {email.body_text}
              </p>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">
            Your Temporary Inbox
          </h1>
        </div>
        <div className="mb-8 space-y-4">
          {tempAddress && (
            <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-2 p-3 border border-zinc-700 rounded-lg bg-zinc-800/30">
              <span className="text-zinc-400 text-sm sm:text-base">
                Address:
              </span>
              <div
                onClick={handleCopyAddress}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleCopyAddress();
                }}
                role="button"
                tabIndex={0}
                className="flex-grow text-center sm:text-left cursor-pointer"
                title="Copy to clipboard"
              >
                <Cover>{isCopied ? "Copied!" : tempAddress}</Cover>
              </div>
            </div>
          )}
        </div>
        {renderContent()}
      </div>

      {isViewing && (
        <>
          {selectedEmail ? (
            <EmailView email={selectedEmail} onClose={handleCloseView} />
          ) : (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
                <p className="text-zinc-400">Loading email...</p>
                <button
                  type="button"
                  onClick={handleCloseView}
                  className="mt-4 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 rounded-md hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
