"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { CurtainIllustration } from "@/components/CurtainIllustration";

interface Settings {
  partialHour: number | null;
  partialMinute: number | null;
  partialSeconds: number | null;
  fullHour: number | null;
  fullMinute: number | null;
}

interface Status {
  online: boolean;
  curtainState: string;
  position: number | null;
  positionKnown: boolean;
  movement: "stopped" | "opening" | "closing";
  movementStartMs: number | null;
  scheduleEnabled: boolean | null;
  settings: Settings | null;
}

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingSchedule, setEditingSchedule] = useState<"partial" | "full" | null>(null);
  const [editValues, setEditValues] = useState<Partial<Settings>>({});
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

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
    let timeoutId: ReturnType<typeof setTimeout>;
    let mounted = true;

    const poll = async () => {
      await fetchStatus();
      if (!mounted) return;
      
      // Only use fast polling when explicitly moving (not when status is null/undefined)
      const isMoving = status?.movement === "opening" || status?.movement === "closing";
      const delay = isMoving ? 2000 : 10000;
      timeoutId = setTimeout(poll, delay);
    };

    poll();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [fetchStatus, status?.movement]);

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
        setTimeout(fetchStatus, 1000);
      }
    } catch {
      setError("Connection error");
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleSchedule() {
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

  async function saveScheduleEdit() {
    if (!editingSchedule) return;
    setActionLoading("save");
    setError("");

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: editValues }),
      });

      if (res.ok) {
        setEditingSchedule(null);
        setEditValues({});
        setTimeout(fetchStatus, 500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
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

  function formatTime(hour: number | null, minute: number | null): string {
    if (hour === null || minute === null) return "--:--";
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  function getDisplayPosition(): number | null {
    // Only return position if known with confidence
    if (status?.positionKnown && status?.position !== null) {
      return status.position;
    }
    return null;
  }

  function isMoving(): boolean {
    return status?.movement === "opening" || status?.movement === "closing";
  }

  function startEdit(type: "partial" | "full") {
    setEditingSchedule(type);
    if (type === "partial") {
      setEditValues({
        partialHour: status?.settings?.partialHour ?? 7,
        partialMinute: status?.settings?.partialMinute ?? 0,
        partialSeconds: status?.settings?.partialSeconds ?? 20,
      });
    } else {
      setEditValues({
        fullHour: status?.settings?.fullHour ?? 9,
        fullMinute: status?.settings?.fullMinute ?? 30,
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-label text-xs uppercase tracking-widest text-[var(--text-secondary)]">Loading</p>
        </div>
      </div>
    );
  }

  const displayPosition = getDisplayPosition();
  const moving = isMoving();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl text-[var(--text-primary)]">
                Scope Promsri
              </h1>
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mt-0.5">
                Curtain Control
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded border border-[var(--border)] hover:bg-[var(--surface)] transition-colors duration-200"
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? (
                  <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                )}
              </button>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded border border-[var(--border)] hover:bg-[var(--surface)] transition-colors duration-200"
                aria-label="Logout"
              >
                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Device Status */}
        <div className="flex items-center justify-between mb-6">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Curtains
          </p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status?.online ? "bg-[var(--success)]" : "bg-[var(--error)]"}`}></div>
            <span className="font-body text-xs text-[var(--text-secondary)]">
              {status?.online ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Curtain Control Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 mb-6">
          {/* Curtain Illustration - only show when position is known */}
          <div className="mb-6">
            {displayPosition !== null ? (
              <CurtainIllustration openPercent={displayPosition} />
            ) : (
              <div className="h-32 flex items-center justify-center">
                {/* Standby/Listening Icon - subtle beacon animation */}
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full border-2 border-[var(--jade)] flex items-center justify-center ${moving ? "animate-pulse" : ""}`}>
                    {moving ? (
                      // Moving indicator
                      <svg className={`w-8 h-8 text-[var(--jade)] ${status?.movement === "opening" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                      </svg>
                    ) : (
                      // Listening/standby icon
                      <svg className="w-8 h-8 text-[var(--jade)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    )}
                  </div>
                  {/* Subtle beacon rings when listening */}
                  {!moving && (
                    <>
                      <div className="absolute inset-0 w-16 h-16 rounded-full border border-[var(--jade)] opacity-30 animate-ping" style={{ animationDuration: "3s" }}></div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Position Display */}
          <div className="text-center mb-6">
            {moving ? (
              // Moving state
              <>
                <p className="font-heading text-2xl sm:text-3xl text-[var(--text-primary)]">
                  {status?.movement === "opening" ? "Opening" : "Closing"}...
                </p>
                <p className="font-body text-xs text-[var(--text-secondary)] mt-1">
                  In motion
                </p>
              </>
            ) : displayPosition !== null ? (
              // Known position
              <>
                <p className="font-heading text-4xl sm:text-5xl text-[var(--text-primary)] tabular-nums">
                  {displayPosition}%
                </p>
                <p className="font-body text-xs text-[var(--text-secondary)] mt-1">
                  {displayPosition === 100 ? "Fully open" : displayPosition === 0 ? "Fully closed" : "Partial"}
                </p>
              </>
            ) : (
              // Unknown position - standby/listening
              <>
                <p className="font-heading text-xl sm:text-2xl text-[var(--text-secondary)]">
                  Standby
                </p>
                <p className="font-body text-xs text-[var(--text-secondary)] mt-1">
                  Listening for commands
                </p>
              </>
            )}
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => sendCommand("OPEN")}
              disabled={actionLoading !== null}
              className="py-4 px-3 bg-[var(--brass)] text-[var(--deep-green)] font-label text-xs uppercase tracking-wider rounded border border-[var(--brass)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex flex-col items-center gap-1"
            >
              {actionLoading === "OPEN" ? (
                <div className="w-5 h-5 border-2 border-[var(--deep-green)] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                  <span>Open</span>
                </>
              )}
            </button>

            <button
              onClick={() => sendCommand("STOP")}
              disabled={actionLoading !== null}
              className="py-4 px-3 bg-[var(--card)] text-[var(--text-primary)] font-label text-xs uppercase tracking-wider rounded border border-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex flex-col items-center gap-1"
            >
              {actionLoading === "STOP" ? (
                <div className="w-5 h-5 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                  </svg>
                  <span>Stop</span>
                </>
              )}
            </button>

            <button
              onClick={() => sendCommand("CLOSE")}
              disabled={actionLoading !== null}
              className="py-4 px-3 bg-[var(--card)] text-[var(--text-primary)] font-label text-xs uppercase tracking-wider rounded border border-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex flex-col items-center gap-1"
            >
              {actionLoading === "CLOSE" ? (
                <div className="w-5 h-5 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                  <span>Close</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Schedule
            </p>
            {/* Master Toggle */}
            {status === null || status.scheduleEnabled === null ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-[var(--border)] rounded-full animate-pulse"></div>
                <span className="font-body text-xs text-[var(--text-secondary)]">Loading...</span>
              </div>
            ) : (
              <button
                onClick={toggleSchedule}
                disabled={actionLoading === "schedule"}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
                  status.scheduleEnabled ? "bg-[var(--brass)]" : "bg-[var(--border)]"
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    status.scheduleEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}></div>
                </div>
                <span className="font-body text-xs text-[var(--text-secondary)]">
                  {status.scheduleEnabled ? "On" : "Off"}
                </span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {/* Partial Open Schedule Row */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
              {editingSchedule === "partial" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--brass)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                    <span className="font-label text-xs uppercase tracking-wide text-[var(--text-primary)]">
                      Morning, partial
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-body text-xs text-[var(--text-secondary)] block mb-1">Time</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={editValues.partialHour ?? 7}
                          onChange={(e) => setEditValues({ ...editValues, partialHour: parseInt(e.target.value) || 0 })}
                          className="w-14 px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-center font-body tabular-nums text-[var(--text-primary)]"
                        />
                        <span className="text-[var(--text-secondary)]">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editValues.partialMinute ?? 0}
                          onChange={(e) => setEditValues({ ...editValues, partialMinute: parseInt(e.target.value) || 0 })}
                          className="w-14 px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-center font-body tabular-nums text-[var(--text-primary)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-body text-xs text-[var(--text-secondary)] block mb-1">
                        Target: ~{Math.round(((editValues.partialSeconds ?? 20) / 40) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="40"
                        value={editValues.partialSeconds ?? 20}
                        onChange={(e) => setEditValues({ ...editValues, partialSeconds: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setEditingSchedule(null); setEditValues({}); }}
                      className="px-3 py-1.5 font-label text-xs uppercase tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveScheduleEdit}
                      disabled={actionLoading === "save"}
                      className="px-3 py-1.5 bg-[var(--brass)] text-[var(--deep-green)] font-label text-xs uppercase tracking-wide rounded hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {actionLoading === "save" ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[var(--brass)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                    <div>
                      <p className="font-label text-xs uppercase tracking-wide text-[var(--text-primary)]">
                        Morning, partial
                      </p>
                      <p className={`font-body text-sm tabular-nums ${!status?.settings ? "text-[var(--text-secondary)] italic" : "text-[var(--text-secondary)]"}`}>
                        {formatTime(status?.settings?.partialHour ?? null, status?.settings?.partialMinute ?? null)} · ~{Math.round(((status?.settings?.partialSeconds ?? 20) / 40) * 100)}% open
                        {!status?.settings && " (tap to set)"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit("partial")}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded transition-colors"
                    aria-label="Edit partial open schedule"
                    title={!status?.settings ? "Set schedule (using defaults)" : "Edit schedule"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Full Open Schedule Row */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
              {editingSchedule === "full" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--jade)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                    <span className="font-label text-xs uppercase tracking-wide text-[var(--text-primary)]">
                      Full open
                    </span>
                  </div>
                  <div>
                    <label className="font-body text-xs text-[var(--text-secondary)] block mb-1">Time</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={editValues.fullHour ?? 9}
                        onChange={(e) => setEditValues({ ...editValues, fullHour: parseInt(e.target.value) || 0 })}
                        className="w-14 px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-center font-body tabular-nums text-[var(--text-primary)]"
                      />
                      <span className="text-[var(--text-secondary)]">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={editValues.fullMinute ?? 30}
                        onChange={(e) => setEditValues({ ...editValues, fullMinute: parseInt(e.target.value) || 0 })}
                        className="w-14 px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-center font-body tabular-nums text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setEditingSchedule(null); setEditValues({}); }}
                      className="px-3 py-1.5 font-label text-xs uppercase tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveScheduleEdit}
                      disabled={actionLoading === "save"}
                      className="px-3 py-1.5 bg-[var(--brass)] text-[var(--deep-green)] font-label text-xs uppercase tracking-wide rounded hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {actionLoading === "save" ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[var(--jade)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                    <div>
                      <p className="font-label text-xs uppercase tracking-wide text-[var(--text-primary)]">
                        Full open
                      </p>
                      <p className={`font-body text-sm tabular-nums ${!status?.settings ? "text-[var(--text-secondary)] italic" : "text-[var(--text-secondary)]"}`}>
                        {formatTime(status?.settings?.fullHour ?? null, status?.settings?.fullMinute ?? null)} · 100% open
                        {!status?.settings && " (tap to set)"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit("full")}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded transition-colors"
                    aria-label="Edit full open schedule"
                    title={!status?.settings ? "Set schedule (using defaults)" : "Edit schedule"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info Note */}
          <p className="font-body text-xs text-[var(--text-secondary)] mt-3 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>Curtains never close automatically. Closing is always manual.</span>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg">
            <p className="font-body text-sm text-[var(--error)] text-center">{error}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-4 mt-auto">
        <p className="font-body text-xs text-[var(--text-secondary)] text-center">
          Asia/Bangkok · {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })}
        </p>
        <p className="font-script text-sm text-[var(--text-secondary)] opacity-50 text-center mt-3 flex items-center justify-center gap-1">
          <span>R</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span>N</span>
        </p>
      </footer>
    </div>
  );
}
