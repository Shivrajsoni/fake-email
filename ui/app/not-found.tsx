import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-display text-[clamp(5rem,15vw,10rem)] font-extrabold tracking-tighter leading-none text-ink">
          404
        </h1>
        <div className="w-16 h-0.5 bg-vermillion mx-auto mt-4 mb-6" />
        <p className="text-smoke text-lg">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block mt-8 h-12 px-8 bg-ink text-page font-display font-bold text-sm uppercase tracking-[0.15em] hover:bg-vermillion transition-colors duration-200 leading-12"
        >
          Back Home
        </Link>
      </div>
    </main>
  );
}
