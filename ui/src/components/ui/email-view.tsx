import React from "react";

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

export const EmailView: React.FC<EmailViewProps> = ({
  email,
  onClose,
}) => {
  // Render plain text body returned by the poll API.
  const renderBody = () => {
    if (email.body_text) {
      return (
        <p className="whitespace-pre-wrap break-words">{email.body_text}</p>
      );
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
            {email.from_addr}
          </p>
        </header>

        {/* Body */}
        <main className="p-6 overflow-y-auto flex-grow bg-zinc-950/50 text-[15px] leading-relaxed text-zinc-300">
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
        </footer>
      </div>
    </div>
  );
};