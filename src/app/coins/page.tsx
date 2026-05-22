import Link from "next/link";

export default function CoinsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] p-8 text-white">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-emerald-400/60">Mode 04</p>
      <h1 className="mb-6 text-5xl font-black uppercase" style={{ fontFamily: "Impact, Arial Black, sans-serif" }}>
        Coins
      </h1>
      <p className="mb-10 text-white/40">This mode is coming soon.</p>
      <Link
        href="/"
        className="rounded-lg border border-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white/60 transition hover:border-white/20 hover:text-white"
      >
        ← Back to Home
      </Link>
    </main>
  );
}
