import mongoose, { Document, Schema, Model } from "mongoose";

export interface IRound4QuestionBankItem extends Document {
  id: string;
  questionText: string;
  answerText: string;
  points: 10 | 20 | 30;
  timeLimitSec: number;
  isUsed: boolean; // Đã được sử dụng chưa
  usedByPackageType?: 40 | 60 | 80 | null; // Gói nào đã dùng
  usedByTeamId?: number | null; // Đội nào đã dùng
  createdAt: Date;
  updatedAt: Date;
}

export interface IRound4QuestionBank extends Document {
  key: string;
  questions10: IRound4QuestionBankItem[]; // Ngân hàng câu hỏi 10 điểm
  questions20: IRound4QuestionBankItem[]; // Ngân hàng câu hỏi 20 điểm
  questions30: IRound4QuestionBankItem[]; // Ngân hàng câu hỏi 30 điểm
  createdAt: Date;
  updatedAt: Date;
}

const Round4QuestionBankItemSchema = new Schema({
  id: { type: String, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true },
  points: { type: Number, required: true, enum: [10, 20, 30] },
  timeLimitSec: { type: Number, required: true },
  isUsed: { type: Boolean, default: false },
  usedByPackageType: { type: Number, enum: [40, 60, 80], default: null },
  usedByTeamId: { type: Number, default: null },
}, { _id: false });

const Round4QuestionBankSchema = new Schema<IRound4QuestionBank>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "current",
    },
    questions10: { type: [Round4QuestionBankItemSchema], default: [] },
    questions20: { type: [Round4QuestionBankItemSchema], default: [] },
    questions30: { type: [Round4QuestionBankItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất
Round4QuestionBankSchema.index({ key: 1 }, { unique: true });

interface IRound4QuestionBankModel extends Model<IRound4QuestionBank> {
  getCurrent(): Promise<IRound4QuestionBank>;
  updateCurrent(updates: Partial<IRound4QuestionBank>): Promise<void>;
}

(Round4QuestionBankSchema.statics as any).getCurrent = async function (): Promise<IRound4QuestionBank> {
  let doc = await this.findOne({ key: "current" });
  if (!doc) {
    doc = await this.create({
      key: "current",
      questions10: [],
      questions20: [],
      questions30: [],
    });
  }
  return doc;
};

(Round4QuestionBankSchema.statics as any).updateCurrent = async function (
  updates: Partial<IRound4QuestionBank>
): Promise<void> {
  await this.findOneAndUpdate({ key: "current" }, updates, { upsert: true, new: true });
};

const Round4QuestionBankModel =
  (mongoose.models.Round4QuestionBank as IRound4QuestionBankModel & Model<IRound4QuestionBank>) ||
  mongoose.model<IRound4QuestionBank>("Round4QuestionBank", Round4QuestionBankSchema);

export default Round4QuestionBankModel;

