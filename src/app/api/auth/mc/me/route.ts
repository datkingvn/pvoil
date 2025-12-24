import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("mc-session");

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);
    await connectDB();

    const user = await User.findById(sessionData.userId);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("MC auth check error:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

