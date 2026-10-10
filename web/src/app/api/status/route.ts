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

    return NextResponse.json({
      online: messages[TOPICS.CURTAIN_AVAILABILITY] === "online",
      curtainState: messages[TOPICS.CURTAIN_STATE] || "unknown",
      scheduleEnabled: messages[TOPICS.SCHEDULE_STATE] === "ON",
      settings: {
        partialHour: parseInt(messages[TOPICS.PARTIAL_HOUR] || "7", 10),
        partialMinute: parseInt(messages[TOPICS.PARTIAL_MINUTE] || "0", 10),
        partialSeconds: parseInt(messages[TOPICS.PARTIAL_SECONDS] || "20", 10),
        fullHour: parseInt(messages[TOPICS.FULL_HOUR] || "9", 10),
        fullMinute: parseInt(messages[TOPICS.FULL_MINUTE] || "30", 10),
      },
    });
  } catch (error) {
    console.error("Status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
