import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { readRetainedMessages, TOPICS } from "@/lib/mqtt";

export async function GET() {
  // Check authentication
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messages = await readRetainedMessages([
      TOPICS.CURTAIN_AVAILABILITY,
      TOPICS.CURTAIN_STATE,
      TOPICS.SCHEDULE_STATE,
      TOPICS.PARTIAL_HOUR,
      TOPICS.PARTIAL_MINUTE,
      TOPICS.PARTIAL_SECONDS,
      TOPICS.FULL_HOUR,
      TOPICS.FULL_MINUTE,
    ]);

    // Use null for unknown values (no retained message received)
    const scheduleState = messages[TOPICS.SCHEDULE_STATE];
    const hasScheduleSettings = 
      TOPICS.PARTIAL_HOUR in messages ||
      TOPICS.PARTIAL_MINUTE in messages ||
      TOPICS.PARTIAL_SECONDS in messages ||
      TOPICS.FULL_HOUR in messages ||
      TOPICS.FULL_MINUTE in messages;

    return NextResponse.json({
      online: messages[TOPICS.CURTAIN_AVAILABILITY] === "online",
      curtainState: messages[TOPICS.CURTAIN_STATE] || "unknown",
      // Return null if we didn't receive the schedule state (don't assume OFF)
      scheduleEnabled: scheduleState === undefined ? null : scheduleState === "ON",
      settings: hasScheduleSettings ? {
        partialHour: TOPICS.PARTIAL_HOUR in messages ? parseInt(messages[TOPICS.PARTIAL_HOUR], 10) : null,
        partialMinute: TOPICS.PARTIAL_MINUTE in messages ? parseInt(messages[TOPICS.PARTIAL_MINUTE], 10) : null,
        partialSeconds: TOPICS.PARTIAL_SECONDS in messages ? parseInt(messages[TOPICS.PARTIAL_SECONDS], 10) : null,
        fullHour: TOPICS.FULL_HOUR in messages ? parseInt(messages[TOPICS.FULL_HOUR], 10) : null,
        fullMinute: TOPICS.FULL_MINUTE in messages ? parseInt(messages[TOPICS.FULL_MINUTE], 10) : null,
      } : null,
    });
  } catch (error) {
    console.error("Status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
