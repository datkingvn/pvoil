import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("team-session");

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);
    await connectDB();

    const team = await Team.findById(sessionData.teamId);

    if (!team) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      team: {
        id: team._id.toString(),
        teamName: team.teamName,
        username: team.username,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

