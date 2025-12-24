import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";

// Xóa đội thi
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "ID đội thi không hợp lệ" },
        { status: 400 }
      );
    }

    const team = await Team.findByIdAndDelete(id);

    if (!team) {
      return NextResponse.json(
        { error: "Không tìm thấy đội thi" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Đã xóa đội thi thành công" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete team error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xóa đội thi" },
      { status: 500 }
    );
  }
}

