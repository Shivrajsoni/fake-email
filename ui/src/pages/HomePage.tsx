import BeamsBackground from "@/components/xui/beams-background";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { generateMailbox } from "@/lib/backend";

const placeholders = [
  "Generate Fake Email !",
  "Enter Username ",
  "or I can also generate for you ?",
  "expires after 1 day !",
  "ultra fast speed for good work",
  "today is your's day !",
];

export function HomePage() {
  const navigate = useNavigate();
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

      const newEmailAddress = data.address;
      if (newEmailAddress) {
        sessionStorage.setItem("temp_address", newEmailAddress);
        navigate("/emails");
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
