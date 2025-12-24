import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Question } from "@/models/Question";

// GET: Lấy tất cả câu hỏi khởi động, nhóm theo package
export async function GET() {
  try {
    await connectDB();

    const questions = await Question.find({
      round: "khoi-dong",
    })
      .sort({ packageNumber: 1, order: 1 })
      .lean();

    // Nhóm theo package
    const packages: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };

    questions.forEach((q) => {
      if (q.packageNumber && q.packageNumber >= 1 && q.packageNumber <= 4) {
        packages[q.packageNumber].push({
          id: q._id.toString(),
          text: q.text,
          points: q.points,
          timeLimitSec: q.timeLimitSec,
          round: q.round,
          isOpenEnded: q.isOpenEnded,
          packageNumber: q.packageNumber,
          order: q.order,
        });
      }
    });

    return NextResponse.json({ packages }, { status: 200 });
  } catch (error: any) {
    console.error("Get questions error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi lấy câu hỏi" },
      { status: 500 }
    );
  }
}

// POST: Tạo câu hỏi mới
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { text, points, timeLimitSec, packageNumber, order } = body;

    if (!text || !packageNumber || !order) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    if (packageNumber < 1 || packageNumber > 4) {
      return NextResponse.json(
        { error: "Số gói phải từ 1 đến 4" },
        { status: 400 }
      );
    }

    if (order < 1 || order > 12) {
      return NextResponse.json(
        { error: "Thứ tự phải từ 1 đến 12" },
        { status: 400 }
      );
    }

    // Kiểm tra xem đã có câu hỏi ở vị trí này chưa
    const existing = await Question.findOne({
      round: "khoi-dong",
      packageNumber,
      order,
    });

    if (existing) {
      return NextResponse.json(
        { error: `Đã có câu hỏi ở vị trí ${order} trong gói ${packageNumber}` },
        { status: 400 }
      );
    }

    const question = new Question({
      text,
      points: points || 10,
      timeLimitSec: timeLimitSec || 15,
      round: "khoi-dong",
      isOpenEnded: true,
      packageNumber,
      order,
    });

    await question.save();

    return NextResponse.json(
      {
        message: "Tạo câu hỏi thành công",
        question: {
          id: question._id.toString(),
          text: question.text,
          points: question.points,
          timeLimitSec: question.timeLimitSec,
          packageNumber: question.packageNumber,
          order: question.order,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo câu hỏi" },
      { status: 500 }
    );
  }
}

