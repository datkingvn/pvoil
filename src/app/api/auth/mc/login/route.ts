import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
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

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Tạo session cho MC
    const sessionData = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Lưu session vào cookie
    response.cookies.set("mc-session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return response;
  } catch (error: any) {
    console.error("MC login error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi đăng nhập" },
      { status: 500 }
    );
  }
}

