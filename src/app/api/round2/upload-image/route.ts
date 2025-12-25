import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs"; // Bắt buộc dùng Node.js runtime để write file

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Không có file được upload" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file ảnh: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File quá lớn. Tối đa 5MB" },
        { status: 400 }
      );
    }

    // Tạo thư mục nếu chưa có
    const uploadDir = join(process.cwd(), "public", "uploads", "round2");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Tạo tên file unique
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `round2-${timestamp}-${random}.${ext}`;
    const filepath = join(uploadDir, filename);

    // Convert File to Buffer và write
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Trả về URL public
    const url = `/uploads/round2/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Lỗi khi upload ảnh" },
      { status: 500 }
    );
  }
}

