import { Cover } from "@/components/ui/cover";
import { EmailView, type EmailDetail } from "@/components/ui/email-view";
import {
  deleteAllEmails,
  deleteEmail,
  getEmailDetail,
  listEmailSummaries,
  type EmailSummary,
} from "@/lib/api";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

function summariesUnchanged(a: EmailSummary[], b: EmailSummary[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].received_at !== b[i].received_at ||
      a[i].subject !== b[i].subject ||
      a[i].preview !== b[i].preview
    ) {
      return false;
    }
  }
  return true;
}

const EmailListItem = memo(function EmailListItem({
  email,
  onOpen,
}: {
  email: EmailSummary;
  onOpen: (id: string) => void;
}) {
  const receivedLabel = useMemo(
    () => new Date(email.received_at).toLocaleString(),
    [email.received_at]
  );

  return (
    <li
      className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer [contain:layout_paint]"
      onClick={() => onOpen(email.id)}
    >
      <div className="flex justify-between items-baseline">
        <p className="font-semibold text-zinc-200">{email.from_address}</p>
        <p className="text-xs text-zinc-500">{receivedLabel}</p>
      </div>
      <p className="text-zinc-300 mt-2 truncate font-medium">{email.subject}</p>
      {email.preview && (
        <p className="text-sm text-zinc-500 mt-1 truncate">{email.preview}</p>
      )}
    </li>
  );
});

export function EmailsPage() {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [tempAddress, setTempAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    []
  );

  const fetchEmails = useCallback(async (address: string) => {
    try {
      const data = await listEmailSummaries(address);
      setEmails((prev) =>
        summariesUnchanged(prev, data) ? prev : data
      );
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch emails.");
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

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const clearPoll = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const startPoll = () => {
      clearPoll();
      intervalId = setInterval(() => {
        void fetchEmails(address);
      }, 10000);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearPoll();
      } else {
        void fetchEmails(address);
        startPoll();
      }
    };

    void fetchEmails(address);
    startPoll();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearPoll();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchEmails]);

  const handleEmailClick = useCallback(
    async (emailId: string) => {
      const address = sessionStorage.getItem("temp_address");
      if (!address) {
        setViewError("Temporary address is missing.");
        return;
      }
      setIsViewing(true);
      setViewError(null);
      try {
        const data = await getEmailDetail(address, emailId);
        setSelectedEmail(data);
      } catch (err: unknown) {
        setViewError(
          err instanceof Error ? err.message : "Failed to fetch email details."
        );
      }
    },
    []
  );

  const handleCloseView = useCallback(() => {
    setIsViewing(false);
    setSelectedEmail(null);
    setViewError(null);
  }, []);

  const handleDeleteEmail = useCallback(
    async (emailId: string) => {
      const address = sessionStorage.getItem("temp_address");
      if (!address) {
        setViewError("Cannot delete: Temporary address is missing.");
        return;
      }
      setIsDeleting(true);
      try {
        await deleteEmail(address, emailId);
        setEmails((prev) => prev.filter((e) => e.id !== emailId));
        handleCloseView();
        showToast("Email deleted successfully!");
      } catch (err: unknown) {
        setViewError(
          err instanceof Error ? err.message : "Failed to delete email."
        );
      } finally {
        setIsDeleting(false);
      }
    },
    [handleCloseView, showToast]
  );

  const handleDeleteAllEmails = useCallback(async () => {
    const address = sessionStorage.getItem("temp_address");
    if (!address) {
      showToast("Cannot delete: Temporary address is missing.", "error");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete all emails in this inbox?"
      )
    ) {
      try {
        const { deleted_count } = await deleteAllEmails(address);
        setEmails([]);
        showToast(`${deleted_count} emails have been deleted.`);
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : "Failed to delete all emails.",
          "error"
        );
      }
    }
  }, [showToast]);

  const handleCopyAddress = useCallback(() => {
    const address = sessionStorage.getItem("temp_address");
    if (address) {
      void navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1000);
    }
  }, []);

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
          <EmailListItem
            key={email.id}
            email={email}
            onOpen={handleEmailClick}
          />
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
              type="button"
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
                role="button"
                tabIndex={0}
                onClick={handleCopyAddress}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCopyAddress();
                  }
                }}
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
