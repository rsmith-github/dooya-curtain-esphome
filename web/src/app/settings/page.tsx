"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Settings {
  partialHour: number;
  partialMinute: number;
  partialSeconds: number;
  fullHour: number;
  fullMinute: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    partialHour: 7,
    partialMinute: 0,
    partialSeconds: 20,
    fullHour: 9,
    fullMinute: 30,
  });
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setOriginalSettings(data.settings);
      }
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSuccess("Settings saved successfully");
        setOriginalSettings(settings);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save settings");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings);

  function formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  function calculatePercentage(seconds: number): number {
    return Math.round((seconds / 40) * 100);
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
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-white">Schedule Settings</h1>
        </div>

        {/* Partial Open Section */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-4 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Partial Open</h2>
          <p className="text-slate-400 text-sm mb-4">
            Opens curtains halfway at the scheduled time
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Time</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.partialHour}
                    onChange={(e) => setSettings({ ...settings, partialHour: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="block text-slate-500 text-xs text-center mt-1">Hour (0-23)</span>
                </div>
                <span className="text-white text-2xl self-start pt-3">:</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={settings.partialMinute}
                    onChange={(e) => setSettings({ ...settings, partialMinute: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="block text-slate-500 text-xs text-center mt-1">Minute (0-59)</span>
                </div>
              </div>
              <p className="text-blue-400 text-sm mt-2 text-center">
                {formatTime(settings.partialHour, settings.partialMinute)} (Asia/Bangkok)
              </p>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">
                Open Duration: {settings.partialSeconds}s ({calculatePercentage(settings.partialSeconds)}%)
              </label>
              <input
                type="range"
                min="1"
                max="40"
                value={settings.partialSeconds}
                onChange={(e) => setSettings({ ...settings, partialSeconds: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-slate-500 text-xs mt-1">
                <span>1s (3%)</span>
                <span>20s (50%)</span>
                <span>40s (100%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Open Section */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-4 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Full Open</h2>
          <p className="text-slate-400 text-sm mb-4">
            Opens curtains fully at the scheduled time
          </p>

          <div>
            <label className="block text-slate-400 text-sm mb-2">Time</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={settings.fullHour}
                  onChange={(e) => setSettings({ ...settings, fullHour: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="block text-slate-500 text-xs text-center mt-1">Hour (0-23)</span>
              </div>
              <span className="text-white text-2xl self-start pt-3">:</span>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={settings.fullMinute}
                  onChange={(e) => setSettings({ ...settings, fullMinute: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="block text-slate-500 text-xs text-center mt-1">Minute (0-59)</span>
              </div>
            </div>
            <p className="text-blue-400 text-sm mt-2 text-center">
              {formatTime(settings.fullHour, settings.fullMinute)} (Asia/Bangkok)
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400 text-sm">
              Curtains never close automatically. Closing is always manual through the app or physical remote.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full py-4 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
        </button>

        {/* Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-500/20 rounded-xl text-green-400 text-center">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
