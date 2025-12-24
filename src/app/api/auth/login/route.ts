import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const team = await Team.findOne({ username: username.toLowerCase() });

    if (!team) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, team.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Tạo session đơn giản (có thể nâng cấp dùng JWT sau)
    const sessionData = {
      teamId: team._id.toString(),
      teamName: team.teamName,
      username: team.username,
    };

    const response = NextResponse.json(
      {
        success: true,
        team: {
          id: team._id.toString(),
          teamName: team.teamName,
          username: team.username,
        },
      },
      { status: 200 }
    );

    // Lưu session vào cookie
    response.cookies.set("team-session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi đăng nhập" },
      { status: 500 }
    );
  }
}

