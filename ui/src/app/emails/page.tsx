"use client";

import { Cover } from "@/components/ui/cover";
import { EmailView, EmailDetail } from "@/components/ui/email-view";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

// This type matches the `EmailSummary` struct from your Rust backend.
interface EmailSummary {
  id: string;
  from_address: string;
  subject: string;
  received_at: string; // ISO 8601 date string
  preview: string | null;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [tempAddress, setTempAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for email view popup
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for toast notifications and copy functionality
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const router = useRouter();

  // Function to show a toast and have it fade out
  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const fetchEmails = useCallback(async (address: string) => {
    try {
      const response = await fetch(`/api/emails?address=${address}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch emails.");
      }
      const data = await response.json();
      setEmails(data);
    } catch (err: any) {
      setError(err.message);
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

    fetchEmails(address); // Initial fetch
    const intervalId = setInterval(() => fetchEmails(address), 10000);
    return () => clearInterval(intervalId);
  }, [fetchEmails]);

  const handleEmailClick = async (emailId: string) => {
    if (!tempAddress) {
      setViewError("Temporary address is missing.");
      return;
    }
    setIsViewing(true);
    try {
      const response = await fetch(
        `/api/emails/${emailId}?address=${tempAddress}`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch email details.");
      }
      const data: EmailDetail = await response.json();
      setSelectedEmail(data);
    } catch (err: any) {
      setViewError(err.message);
    }
  };

  const handleCloseView = () => {
    setIsViewing(false);
    setSelectedEmail(null);
    setViewError(null);
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (!tempAddress) {
      setViewError("Cannot delete: Temporary address is missing.");
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/emails/${emailId}?address=${tempAddress}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete email.");
      }
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      handleCloseView();
      showToast("Email deleted successfully!");
    } catch (err: any) {
      setViewError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllEmails = async () => {
    if (!tempAddress) {
      showToast("Cannot delete: Temporary address is missing.", "error");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete all emails in this inbox?"
      )
    ) {
      try {
        const response = await fetch(`/api/emails/all?address=${tempAddress}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete all emails.");
        }
        const { deleted_count } = await response.json();
        setEmails([]);
        showToast(`${deleted_count} emails have been deleted.`);
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
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
      return <p className="text-red-500">{error}</p>;
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
            onClick={() => handleEmailClick(email.id)}
            className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-baseline">
              <p className="font-semibold text-zinc-200">
                {email.from_address}
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(email.received_at).toLocaleString()}
              </p>
            </div>
            <p className="text-zinc-300 mt-2 truncate font-medium">
              {email.subject}
            </p>
            {email.preview && (
              <p className="text-sm text-zinc-500 mt-1 truncate">
                {email.preview}
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
          {emails.length > 0 && (
            <button
              onClick={handleDeleteAllEmails}
              className="bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-md transition-colors"
            >
              Delete All
            </button>
          )}
        </div>
        <div className="mb-8 space-y-4">
          {tempAddress && (
            <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-2 p-3 border border-zinc-700 rounded-lg bg-zinc-800/30">
              <span className="text-zinc-400 text-sm sm:text-base">
                Address:
              </span>
              <div
                onClick={handleCopyAddress}
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
            <EmailView
              email={selectedEmail}
              onClose={handleCloseView}
              onDelete={handleDeleteEmail}
              isDeleting={isDeleting}
            />
          ) : (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
                {viewError ? (
                  <p className="text-red-500">{viewError}</p>
                ) : (
                  <p className="text-zinc-400">Loading email...</p>
                )}
                <button
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

      {toast && (
        <div
          className={`fixed bottom-5 right-5 p-4 rounded-lg text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}
