import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Page not found</h1>
        <p className="text-zinc-400 mt-2">The page you requested does not exist.</p>
        <Link
          href="/"
          className="inline-block mt-6 rounded-md bg-zinc-200 text-zinc-900 px-4 py-2 font-semibold hover:bg-white"
        >
          Back Home
        </Link>
      </div>
    </main>
  );
}
