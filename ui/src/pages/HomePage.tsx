import BeamsBackground from "@/components/xui/beams-background";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { generateMailbox } from "@/lib/api";
import { Helmet } from "react-helmet-async";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

const SITE_DESCRIPTION =
  "Create a disposable temporary email address for sign-ups, QA, and privacy. Your inbox updates in real time; mailboxes expire automatically.";

function siteOrigin(): string | undefined {
  const raw = import.meta.env.VITE_SITE_URL;
  if (!raw || typeof raw !== "string") {
    return undefined;
  }
  return raw.replace(/\/$/, "");
}

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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        const data = await generateMailbox(username || null);
        const newEmailAddress = data.address;
        if (newEmailAddress) {
          sessionStorage.setItem("temp_address", newEmailAddress);
          navigate("/emails");
        } else {
          throw new Error("Backend did not return a new email address.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, username],
  );

  const origin = siteOrigin();

  return (
    <div className="relative h-screen w-full flex items-center justify-center">
      <Helmet>
        <title>Fake Email — Temporary disposable inbox</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta property="og:title" content="Fake Email — Temporary disposable inbox" />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        {origin ? (
          <>
            <link rel="canonical" href={`${origin}/`} />
            <meta property="og:url" content={`${origin}/`} />
          </>
        ) : null}
      </Helmet>
      <BeamsBackground className="absolute inset-0 z-0" />
      <div className="relative z-10 mt-[min(30vh,15rem)] flex w-full max-w-xl flex-col items-center px-4">
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
