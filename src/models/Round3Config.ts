import mongoose, { Document, Schema, Model } from "mongoose";
import { Round3Question } from "@/lib/round3/types";

export interface IRound3Config extends Document {
  questions: Round3Question[];
  createdAt: Date;
  updatedAt: Date;
}

const Round3QuestionStepSchema = new Schema({
  label: { type: String, required: true },
  text: { type: String, required: true },
}, { _id: false });

const Round3QuestionSchema = new Schema({
  id: { type: Number, required: true, enum: [1, 2, 3, 4] },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true },
  questionType: { type: String, required: true, enum: ["suy-luan", "doan-bang", "sap-xep"] },
  order: { type: Number, required: true, min: 1, max: 4 },
  videoUrl: { type: String, default: "" },
  steps: { type: [Round3QuestionStepSchema], default: [] },
}, { _id: false });

const Round3ConfigSchema = new Schema<IRound3Config>(
  {
    questions: { type: [Round3QuestionSchema], required: true, default: [] },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất
Round3ConfigSchema.index({}, { unique: true });

const Round3ConfigModel =
  (mongoose.models.Round3Config as Model<IRound3Config>) ||
  mongoose.model<IRound3Config>("Round3Config", Round3ConfigSchema);

export default Round3ConfigModel;

