"use client";

import BeamsBackground from "@/components/xui/beams-background";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { generateMailbox } from "@/lib/backend";
import { useRouter } from "next/navigation";

const placeholders = [
  "Generate Fake Email !",
  "Enter Username ",
  "or I can also generate for you ?",
  "expires after 1 day !",
  "ultra fast speed for good work",
  "today is your's day !",
];

export function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await generateMailbox({ username: username || null });

      const newEmailAddress = data.temp_email_addr;
      if (newEmailAddress) {
        sessionStorage.setItem("temp_address", newEmailAddress);
        router.push("/emails");
      } else {
        throw new Error("Backend did not return a new email address.");
      }
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <BeamsBackground className="absolute inset-0 z-0" />
      {/* Spacer clears hero (“Get Fake / Email”); input sits lower so it does not overlap */}
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center">
        <div className="h-[min(52vh,22rem)] w-full shrink-0 sm:h-[min(50vh,24rem)]" />
        <div className="mt-6 w-full max-w-xl shrink-0 px-4 pb-12 sm:mt-10 sm:pb-16">
          <PlaceholdersAndVanishInput
            placeholders={placeholders}
            onChange={handleChange}
            onSubmit={onSubmit}
          />
          {isLoading && (
            <p className="mt-4 text-center text-sm text-white/90">
              Generating your email...
            </p>
          )}
          {error && (
            <p className="mt-4 text-center text-sm text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
