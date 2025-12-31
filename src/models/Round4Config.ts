import mongoose, { Document, Schema, Model } from "mongoose";
import { Round4Package, Round4Question } from "@/lib/round4/types";

export interface IRound4Config extends Document {
  packages: Round4Package[];
  createdAt: Date;
  updatedAt: Date;
}

const Round4QuestionSchema = new Schema({
  id: { type: String, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true },
  points: { type: Number, required: true, enum: [10, 20, 30] },
  timeLimitSec: { type: Number, required: true, enum: [10, 15, 20, 30] },
  order: { type: Number, required: true, min: 1, max: 3 },
}, { _id: false });

const Round4PackageSchema = new Schema({
  type: { type: Number, required: true, enum: [40, 60, 80] },
  questions: { type: [Round4QuestionSchema], required: true, default: [] },
  selectedByTeamId: { type: Number, default: null },
}, { _id: false });

const Round4ConfigSchema = new Schema<IRound4Config>(
  {
    packages: { type: [Round4PackageSchema], required: true, default: [] },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất
Round4ConfigSchema.index({}, { unique: true });

// Xóa model cũ nếu có để tránh cache schema cũ
if (mongoose.models.Round4Config) {
  delete mongoose.models.Round4Config;
}

const Round4ConfigModel =
  mongoose.model<IRound4Config>("Round4Config", Round4ConfigSchema);

export default Round4ConfigModel;

