import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import bcrypt from "bcryptjs";

// Lấy danh sách tất cả đội thi
export async function GET() {
  try {
    await connectDB();
    const teams = await Team.find().select("-password").sort({ createdAt: -1 });
    // Map _id thành id để frontend sử dụng
    const teamsWithId = teams.map((team) => ({
      id: team._id.toString(),
      teamName: team.teamName,
      username: team.username,
    }));
    return NextResponse.json({ teams: teamsWithId }, { status: 200 });
  } catch (error: any) {
    console.error("Get teams error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi lấy danh sách đội thi" },
      { status: 500 }
    );
  }
}

// Tạo đội thi mới (chỉ MC mới có quyền)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { teamName, username, password } = await request.json();

    // Validation
    if (!teamName || !username || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    // Kiểm tra username đã tồn tại chưa
    const existingUsername = await Team.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo đội thi mới
    const team = new Team({
      teamName,
      username: username.toLowerCase(),
      password: hashedPassword,
    });

    await team.save();

    return NextResponse.json(
      {
        success: true,
        team: {
          id: team._id.toString(),
          teamName: team.teamName,
          username: team.username,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create team error:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `${field === "username" ? "Tên đăng nhập" : "Mã đội thi"} đã tồn tại` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo đội thi" },
      { status: 500 }
    );
  }
}

