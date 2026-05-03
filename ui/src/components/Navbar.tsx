"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

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
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 overflow-hidden rounded-md border border-chalk group-hover:border-vermillion transition-colors duration-300">
          <Image
            src="/icon.png"
            alt="Fake Email Logo"
            fill
            sizes="(max-width: 768px) 32px, 40px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority
          />
        </div>
        <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-ink">
          Fake Email
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/Shivrajsoni/fake-email"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold uppercase tracking-widest text-smoke hover:text-vermillion transition-colors"
        >
          GitHub
        </a>
      </div>
    </motion.nav>
  );
}
