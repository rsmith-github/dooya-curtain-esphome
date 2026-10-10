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
    const { command } = await request.json();

    // Validate command
    const validCommands = ["OPEN", "STOP", "CLOSE"];
    if (!validCommands.includes(command)) {
      return NextResponse.json(
        { error: "Invalid command. Use OPEN, STOP, or CLOSE" },
        { status: 400 }
      );
    }

    await publishMessage(TOPICS.CURTAIN_COMMAND, command);

    return NextResponse.json({ success: true, command });
  } catch (error) {
    console.error("Curtain command error:", error);
    return NextResponse.json(
      { error: "Failed to send command" },
      { status: 500 }
    );
  }
}
