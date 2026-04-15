"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { generateMailbox } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await generateMailbox({ username: username || null });
      const addr = data.temp_email_addr;
      if (addr) {
        sessionStorage.setItem("temp_address", addr);
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
    <main className="relative min-h-dvh overflow-hidden">
      {/* Decorative geometry */}
      <motion.div
        className="absolute -top-[30vh] -right-[15vw] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full border border-chalk"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-[10vh] -left-[5vw] w-[20vw] h-[20vw] max-w-[300px] max-h-[300px] rounded-full border border-chalk"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-dvh flex-col justify-center px-6 sm:px-12 lg:px-20">
        <div className="w-full max-w-3xl">
          {/* Hero */}
          <motion.div
            className="mb-12 sm:mb-16"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } },
            }}
          >
            <h1 className="select-none">
              <span className="sr-only">DISPOSABLE EMAIL</span>
              <div className="overflow-hidden" aria-hidden="true">
                <motion.span
                  className="block font-display text-[clamp(2.8rem,8vw,7rem)] font-extrabold leading-[0.88] tracking-[-0.03em]"
                  variants={{
                    hidden: { y: "100%" },
                    visible: {
                      y: 0,
                      transition: { duration: 0.8, ease },
                    },
                  }}
                >
                  DISPOSABLE
                </motion.span>
              </div>
              <div className="overflow-hidden" aria-hidden="true">
                <motion.span
                  className="block font-display text-[clamp(2.8rem,8vw,7rem)] font-extrabold leading-[0.88] tracking-[-0.03em] flex items-baseline gap-2 sm:gap-4"
                  variants={{
                    hidden: { y: "100%" },
                    visible: {
                      y: 0,
                      transition: { duration: 0.8, ease },
                    },
                  }}
                >
                  EMAIL
                  <span
                    className="inline-block w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-vermillion shrink-0 motion-safe:animate-dot-pulse"
                    aria-hidden="true"
                  />
                </motion.span>
              </div>
            </h1>

            <motion.p
              className="mt-5 sm:mt-6 text-smoke text-base sm:text-lg tracking-tight max-w-md"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: "easeOut" },
                },
              }}
            >
              Generate a temporary inbox in seconds.
              <br className="hidden sm:block" />
              No signup. No tracking. Just email.
            </motion.p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="enter username or leave blank"
                aria-label="Username for temporary email"
                className="flex-1 h-14 px-5 bg-paper border-2 border-ink font-mono text-sm text-ink placeholder:text-ash focus:outline-none focus:border-vermillion transition-colors duration-200"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="h-14 px-8 bg-ink text-page font-display font-bold text-sm uppercase tracking-[0.15em] hover:bg-vermillion focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion disabled:opacity-40 transition-colors duration-200 flex items-center justify-center gap-2.5 shrink-0"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-page/30 border-t-page rounded-full animate-spin" />
                ) : (
                  <>
                    Generate
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <motion.p
                className="mt-4 text-sm text-vermillion font-medium"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </motion.form>

          {/* Footer rule */}
          <motion.div
            className="mt-16 sm:mt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <motion.div
              className="h-px bg-chalk"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.9, ease }}
              style={{ transformOrigin: "left" }}
            />
            <p className="mt-4 text-xs text-ash uppercase tracking-[0.2em] font-medium">
              Emails auto-expire &middot; No registration &middot; Built for
              developers
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
