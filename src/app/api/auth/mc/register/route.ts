import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Kiểm tra xem đã có MC nào chưa
    const existingUsers = await User.countDocuments();
    
    // Chỉ cho phép đăng ký MC đầu tiên (hoặc có thể thêm logic admin sau)
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: "Đã có tài khoản MC. Vui lòng đăng nhập." },
        { status: 403 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 4 ký tự" },
        { status: 400 }
      );
    }

    // Kiểm tra username đã tồn tại chưa
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo tài khoản MC đầu tiên
    const user = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      role: "mc",
    });

    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: "Đăng ký tài khoản MC thành công!",
        user: {
          id: user._id.toString(),
          username: user.username,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("MC register error:", error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi đăng ký" },
      { status: 500 }
    );
  }
}

