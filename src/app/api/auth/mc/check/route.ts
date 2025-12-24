import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    await connectDB();
    const userCount = await User.countDocuments();
    return NextResponse.json({ hasMC: userCount > 0 }, { status: 200 });
  } catch (error) {
    console.error("Check MC error:", error);
    return NextResponse.json({ hasMC: false }, { status: 500 });
  }
}

