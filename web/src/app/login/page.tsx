"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)]"
      style={{ visibility: mounted ? "visible" : "hidden" }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl md:text-4xl font-medium text-[var(--deep-green)] tracking-tight">
            Scope Promsri
          </h1>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mt-2">
            Curtain Control
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-label text-xs uppercase tracking-wide text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-body text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brass)] focus:border-[var(--brass)] transition-colors"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="text-[var(--error)] text-sm text-center bg-[var(--error)]/10 py-2 px-4 rounded-lg font-body">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[var(--brass)] text-white font-label text-sm uppercase tracking-wide rounded-lg hover:bg-[var(--brass-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brass)] focus:ring-offset-2 focus:ring-offset-[var(--card)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Logging in..." : "Continue"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[var(--text-secondary)] font-body text-xs mt-8">
          Smart home automation
        </p>
      </div>
    </div>
  );
}
