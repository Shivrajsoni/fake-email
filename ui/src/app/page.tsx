"use client";
import BeamsBackground from "@/@/components/xui/beams-background";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { useRouter } from "next/navigation";
import { useState } from "react";

const placeholders = [
  "Generate Fake Email !",
  "Enter Username ",
  "or I can also generate for you ?",
  "expires after 1 day !",
  "ultra fast speed for good work",
  "today is your's day !",
];

export default function Home() {
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
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const newEmailAddress = data.address;
      if (newEmailAddress) {
        // Store the address in session storage to use on the emails page
        sessionStorage.setItem("temp_address", newEmailAddress);
        // Redirect to the page that will list the emails
        router.push("/emails");
      } else {
        throw new Error("Backend did not return a new email address.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center">
      <BeamsBackground className="absolute inset-0 z-0" />
      <div className="relative z-10 mt-100 flex flex-col items-center">
        <PlaceholdersAndVanishInput
          placeholders={placeholders}
          onChange={handleChange}
          onSubmit={onSubmit}
        />
        {isLoading && (
          <p className="text-white mt-4">Generating your email...</p>
        )}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
}
