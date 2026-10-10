import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { publishMessage, TOPICS } from "@/lib/mqtt";

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Handle schedule enable/disable
    if (body.enabled !== undefined) {
      const command = body.enabled ? "ON" : "OFF";
      await publishMessage(TOPICS.SCHEDULE_COMMAND, command);
      return NextResponse.json({ success: true, enabled: body.enabled });
    }

    // Handle schedule settings update
    if (body.settings) {
      const { partialHour, partialMinute, partialSeconds, fullHour, fullMinute } = body.settings;

      // Validate inputs
      if (partialHour !== undefined) {
        const val = parseInt(partialHour, 10);
        if (isNaN(val) || val < 0 || val > 23) {
          return NextResponse.json({ error: "Invalid partial hour (0-23)" }, { status: 400 });
        }
        await publishMessage(TOPICS.PARTIAL_HOUR_SET, String(val));
      }

      if (partialMinute !== undefined) {
        const val = parseInt(partialMinute, 10);
        if (isNaN(val) || val < 0 || val > 59) {
          return NextResponse.json({ error: "Invalid partial minute (0-59)" }, { status: 400 });
        }
        await publishMessage(TOPICS.PARTIAL_MINUTE_SET, String(val));
      }

      if (partialSeconds !== undefined) {
        const val = parseInt(partialSeconds, 10);
        if (isNaN(val) || val < 1 || val > 40) {
          return NextResponse.json({ error: "Invalid partial seconds (1-40)" }, { status: 400 });
        }
        await publishMessage(TOPICS.PARTIAL_SECONDS_SET, String(val));
      }

      if (fullHour !== undefined) {
        const val = parseInt(fullHour, 10);
        if (isNaN(val) || val < 0 || val > 23) {
          return NextResponse.json({ error: "Invalid full hour (0-23)" }, { status: 400 });
        }
        await publishMessage(TOPICS.FULL_HOUR_SET, String(val));
      }

      if (fullMinute !== undefined) {
        const val = parseInt(fullMinute, 10);
        if (isNaN(val) || val < 0 || val > 59) {
          return NextResponse.json({ error: "Invalid full minute (0-59)" }, { status: 400 });
        }
        await publishMessage(TOPICS.FULL_MINUTE_SET, String(val));
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Schedule command error:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}
