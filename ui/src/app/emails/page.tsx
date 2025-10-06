'use client';

import { useEffect, useState } from 'react';

// This type now perfectly matches the `EmailSummary` struct from your Rust backend.
interface EmailSummary {
  id: string;
  from_address: string;
  subject: string;
  received_at: string; // ISO 8601 date string
  preview: string | null; // Added the preview field
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [tempAddress, setTempAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const address = sessionStorage.getItem('temp_address');
    setTempAddress(address);

    if (!address) {
      setError('No temporary address found in session. Please generate a new one.');
      setIsLoading(false);
      return;
    }

    const fetchEmails = async () => {
      try {
        const response = await fetch(`/api/emails?address=${address}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch emails.');
        }
        const data = await response.json();
        setEmails(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (isLoading) {
          setIsLoading(false);
        }
      }
    };

    fetchEmails();

    const intervalId = setInterval(fetchEmails, 10000);

    return () => clearInterval(intervalId);
  }, [isLoading]);

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
            Waiting for new mail... this page will automatically refresh every 10 seconds.
          </p>
        </div>
      );
    }

    return (
      <ul className="space-y-3 w-full">
        {emails.map((email) => (
          <li
            key={email.id}
            className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-baseline">
              <p className="font-semibold text-zinc-200">{email.from_address}</p>
              <p className="text-xs text-zinc-500">
                {new Date(email.received_at).toLocaleString()}
              </p>
            </div>
            <p className="text-zinc-300 mt-2 truncate font-medium">{email.subject}</p>
            {/* Display the new preview field */}
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
        <div className="mb-8 p-4 bg-zinc-800/50 rounded-lg">
          <h1 className="text-lg font-semibold text-zinc-300">Your Temporary Inbox</h1>
          {tempAddress && (
            <p className="text-blue-400 font-mono bg-blue-900/20 px-3 py-1 rounded-full inline-block mt-2 text-sm">
              {tempAddress}
            </p>
          )}
        </div>
        {renderContent()}
      </div>
    </main>
  );
}