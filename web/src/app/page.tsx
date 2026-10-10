"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Status {
  online: boolean;
  curtainState: string;
  scheduleEnabled: boolean | null;
}

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setError("");
      }
    } catch {
      setError("Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function sendCommand(command: string) {
    setActionLoading(command);
    setError("");

    try {
      const res = await fetch("/api/curtain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Command failed");
      } else {
        // Refresh status after command
        setTimeout(fetchStatus, 1000);
      }
    } catch {
      setError("Connection error");
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleSchedule() {
    // Don't allow toggling if state is unknown (null)
    if (!status || status.scheduleEnabled === null) return;
    setActionLoading("schedule");
    setError("");

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !status.scheduleEnabled }),
      });

      if (res.ok) {
        setStatus({ ...status, scheduleEnabled: !status.scheduleEnabled });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to toggle schedule");
      }
    } catch {
      setError("Connection error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Curtain Control</h1>
          <div className="flex gap-2">
            <Link
              href="/settings"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400">Device Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status?.online ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className={status?.online ? "text-green-400" : "text-red-400"}>
                {status?.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Curtain State</span>
            <span className="text-white font-medium capitalize">{status?.curtainState || "Unknown"}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => sendCommand("OPEN")}
            disabled={actionLoading !== null}
            className="aspect-square bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
          >
            {actionLoading === "OPEN" ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span className="font-semibold">Open</span>
              </>
            )}
          </button>

          <button
            onClick={() => sendCommand("STOP")}
            disabled={actionLoading !== null}
            className="aspect-square bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
          >
            {actionLoading === "STOP" ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span className="font-semibold">Stop</span>
              </>
            )}
          </button>

          <button
            onClick={() => sendCommand("CLOSE")}
            disabled={actionLoading !== null}
            className="aspect-square bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
          >
            {actionLoading === "CLOSE" ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="font-semibold">Close</span>
              </>
            )}
          </button>
        </div>

        {/* Schedule Toggle */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Morning Schedule</h3>
              <p className="text-slate-400 text-sm">
                {status?.scheduleEnabled === null 
                  ? "Loading state..." 
                  : "Auto-open at scheduled times"}
              </p>
            </div>
            {status?.scheduleEnabled === null ? (
              <div className="w-14 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
              </div>
            ) : (
              <button
                onClick={toggleSchedule}
                disabled={actionLoading === "schedule"}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  status?.scheduleEnabled ? "bg-blue-500" : "bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    status?.scheduleEnabled ? "translate-x-7" : "translate-x-1"
                  }`}
                ></div>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
