import mongoose, { Schema, Document, Model } from "mongoose";
import { Round2Config as Round2ConfigType, Round2Question } from "@/lib/round2/types";

export interface IRound2Config extends Document {
  imageOriginalUrl: string;
  keywordAnswer: string;
  keywordNormalized: string;
  keywordLength: number;
  questions: Round2Question[];
  createdAt: Date;
  updatedAt: Date;
}

const Round2QuestionSchema = new Schema({
  id: { type: Number, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true },
  answerWordCount: { type: Number, required: true },
  tileStatus: { 
    type: String, 
    enum: ["hidden", "selected", "revealed", "wrong"],
    default: "hidden"
  },
}, { _id: false });

const Round2ConfigSchema = new Schema<IRound2Config>(
  {
    imageOriginalUrl: {
      type: String,
      required: true,
    },
    keywordAnswer: {
      type: String,
      required: true,
    },
    keywordNormalized: {
      type: String,
      required: true,
    },
    keywordLength: {
      type: Number,
      required: true,
    },
    questions: {
      type: [Round2QuestionSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo model nếu chưa tồn tại (tránh lỗi khi hot reload)
const Round2ConfigModel: Model<IRound2Config> = 
  mongoose.models.Round2Config || mongoose.model<IRound2Config>("Round2Config", Round2ConfigSchema);

export default Round2ConfigModel;

