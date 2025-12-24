import mongoose, { Document, Schema } from "mongoose";
import { RoundType } from "@/lib/types";

export interface IQuestion extends Document {
  text: string;
  options?: Array<{
    label: string;
    text: string;
  }>;
  correctIndex?: number;
  points: number;
  timeLimitSec: number;
  round: RoundType;
  isOpenEnded?: boolean;
  packageNumber?: number; // 1, 2, 3, 4 cho vòng khởi động
  order: number; // Thứ tự trong gói (1-12)
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    text: {
      type: String,
      required: true,
    },
    options: [
      {
        label: String,
        text: String,
      },
    ],
    correctIndex: {
      type: Number,
    },
    points: {
      type: Number,
      required: true,
      default: 10,
    },
    timeLimitSec: {
      type: Number,
      required: true,
      default: 15,
    },
    round: {
      type: String,
      required: true,
      enum: ["khoi-dong", "vuot-chuong-ngai-vat", "tang-toc", "ve-dich"],
    },
    isOpenEnded: {
      type: Boolean,
      default: false,
    },
    packageNumber: {
      type: Number,
      min: 1,
      max: 4,
    },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Index để query nhanh hơn
QuestionSchema.index({ round: 1, packageNumber: 1, order: 1 });

export const Question = mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);

