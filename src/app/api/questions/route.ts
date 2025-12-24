import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Question } from "@/models/Question";
import { RoundType } from "@/lib/types";

// GET: Lấy tất cả câu hỏi theo vòng
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const round = searchParams.get("round") as RoundType | null;

    if (!round) {
      return NextResponse.json(
        { error: "Vui lòng chọn vòng thi" },
        { status: 400 }
      );
    }

    const query: any = { round };

    // Nếu là vòng khởi động, có thể filter theo package
    if (round === "khoi-dong") {
      const packageNumber = searchParams.get("packageNumber");
      if (packageNumber) {
        query.packageNumber = parseInt(packageNumber);
      }
    }

    const questions = await Question.find(query)
      .sort(round === "khoi-dong" ? { packageNumber: 1, order: 1 } : { order: 1 })
      .lean();

    // Nếu là vòng khởi động, nhóm theo package
    if (round === "khoi-dong") {
      const packages: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };

      questions.forEach((q: any) => {
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
    }

    // Các vòng khác: trả về danh sách câu hỏi
    return NextResponse.json(
      {
        questions: questions.map((q: any) => ({
          id: q._id.toString(),
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          points: q.points,
          timeLimitSec: q.timeLimitSec,
          round: q.round,
          isOpenEnded: q.isOpenEnded,
          order: q.order,
        })),
      },
      { status: 200 }
    );
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
    const { text, options, correctIndex, points, timeLimitSec, round, packageNumber, order, isOpenEnded } = body;

    if (!text || !round) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    // Validation cho vòng khởi động
    if (round === "khoi-dong") {
      if (!packageNumber || packageNumber < 1 || packageNumber > 4) {
        return NextResponse.json(
          { error: "Số gói phải từ 1 đến 4" },
          { status: 400 }
        );
      }

      if (!order || order < 1 || order > 12) {
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
    } else {
      // Các vòng khác: cần có options và correctIndex
      if (!options || !Array.isArray(options) || options.length !== 4) {
        return NextResponse.json(
          { error: "Vui lòng cung cấp đầy đủ 4 phương án" },
          { status: 400 }
        );
      }

      if (correctIndex === undefined || correctIndex < 0 || correctIndex > 3) {
        return NextResponse.json(
          { error: "Vui lòng chọn đáp án đúng" },
          { status: 400 }
        );
      }
    }

    const question = new Question({
      text,
      options: round !== "khoi-dong" ? options : undefined,
      correctIndex: round !== "khoi-dong" ? correctIndex : undefined,
      points: points || (round === "khoi-dong" ? 10 : 20),
      timeLimitSec: timeLimitSec || (round === "khoi-dong" ? 15 : 30),
      round,
      isOpenEnded: round === "khoi-dong" ? true : false,
      packageNumber: round === "khoi-dong" ? packageNumber : undefined,
      order: order || 1,
    });

    await question.save();

    return NextResponse.json(
      {
        message: "Tạo câu hỏi thành công",
        question: {
          id: question._id.toString(),
          text: question.text,
          options: question.options,
          correctIndex: question.correctIndex,
          points: question.points,
          timeLimitSec: question.timeLimitSec,
          round: question.round,
          isOpenEnded: question.isOpenEnded,
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

