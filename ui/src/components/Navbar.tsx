"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "@/components/Logo";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 h-16 sm:h-20 z-50 flex items-center justify-between px-6 sm:px-12 lg:px-20 backdrop-blur-md bg-page/80 border-b border-chalk shadow-sm"
    >
      <Link
        href="/"
        className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion rounded-md"
      >
        <Logo
          size={40}
          className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"
        />
        <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-ink leading-none flex items-baseline gap-1">
          Fake
          <span className="text-vermillion">.</span>
          Email
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/sidhesh77/fake-emaail"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          className="group relative inline-flex items-center gap-2 rounded-full border border-chalk bg-paper/80 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-ink shadow-sm hover:bg-ink hover:text-paper hover:border-ink hover:shadow-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="w-4 h-4 fill-current transition-transform duration-300 group-hover:rotate-[360deg]"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
          </svg>
          <span>GitHub</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-vermillion group-hover:bg-paper transition-colors duration-300" />
        </a>
      </div>
    </motion.nav>
  );
}
