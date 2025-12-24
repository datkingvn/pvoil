import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Question } from "@/models/Question";
import mongoose from "mongoose";

// PUT: Cập nhật câu hỏi
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { text, options, correctIndex, points, timeLimitSec, packageNumber, order } = body;

    const currentQuestion = await Question.findById(id);
    if (!currentQuestion) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    // Validation cho vòng khởi động
    if (currentQuestion.round === "khoi-dong") {
      if (order !== undefined || packageNumber !== undefined) {
        const newOrder = order !== undefined ? order : currentQuestion.order;
        const newPackage = packageNumber !== undefined ? packageNumber : currentQuestion.packageNumber;

        if (newPackage && (newPackage < 1 || newPackage > 4)) {
          return NextResponse.json(
            { error: "Số gói phải từ 1 đến 4" },
            { status: 400 }
          );
        }

        if (newOrder < 1 || newOrder > 12) {
          return NextResponse.json(
            { error: "Thứ tự phải từ 1 đến 12" },
            { status: 400 }
          );
        }

        // Kiểm tra conflict với câu hỏi khác
        const conflict = await Question.findOne({
          round: "khoi-dong",
          packageNumber: newPackage,
          order: newOrder,
          _id: { $ne: id },
        });

        if (conflict) {
          return NextResponse.json(
            { error: `Đã có câu hỏi ở vị trí ${newOrder} trong gói ${newPackage}` },
            { status: 400 }
          );
        }
      }
    } else {
      // Các vòng khác: validate options và correctIndex
      if (options !== undefined) {
        if (!Array.isArray(options) || options.length !== 4) {
          return NextResponse.json(
            { error: "Vui lòng cung cấp đầy đủ 4 phương án" },
            { status: 400 }
          );
        }
      }

      if (correctIndex !== undefined && (correctIndex < 0 || correctIndex > 3)) {
        return NextResponse.json(
          { error: "Đáp án đúng phải từ 0 đến 3" },
          { status: 400 }
        );
      }
    }

    const question = await Question.findByIdAndUpdate(
      id,
      {
        ...(text !== undefined && { text }),
        ...(options !== undefined && { options }),
        ...(correctIndex !== undefined && { correctIndex }),
        ...(points !== undefined && { points }),
        ...(timeLimitSec !== undefined && { timeLimitSec }),
        ...(packageNumber !== undefined && { packageNumber }),
        ...(order !== undefined && { order }),
      },
      { new: true }
    );

    if (!question) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Cập nhật câu hỏi thành công",
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
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update question error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi cập nhật câu hỏi" },
      { status: 500 }
    );
  }
}

// DELETE: Xóa câu hỏi
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    const question = await Question.findByIdAndDelete(id);

    if (!question) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Xóa câu hỏi thành công" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete question error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xóa câu hỏi" },
      { status: 500 }
    );
  }
}

