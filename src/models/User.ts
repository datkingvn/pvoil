import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  password: string;
  role: "mc" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Tên đăng nhập là bắt buộc"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Mật khẩu là bắt buộc"],
      minlength: [4, "Mật khẩu phải có ít nhất 4 ký tự"],
    },
    role: {
      type: String,
      enum: ["mc", "admin"],
      default: "mc",
    },
  },
  {
    timestamps: true,
  }
);

// Tạo model nếu chưa tồn tại (tránh lỗi khi hot reload)
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;

