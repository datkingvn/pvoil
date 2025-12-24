import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeam extends Document {
  teamName: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    teamName: {
      type: String,
      required: [true, "Tên đội thi là bắt buộc"],
      trim: true,
    },
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
  },
  {
    timestamps: true,
  }
);

// Tạo model nếu chưa tồn tại (tránh lỗi khi hot reload)
const Team: Model<ITeam> = mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;

