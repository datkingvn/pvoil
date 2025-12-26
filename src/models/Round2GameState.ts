import mongoose, { Schema, Document, Model } from "mongoose";
import { Round2GameState, Round2TeamAnswer, Round2BuzzerPress } from "@/lib/round2/types";

export interface IRound2GameState extends Document {
  key: string; // Unique key để identify document duy nhất (sẽ là "current")
  status: "idle" | "tile_selected" | "question_open" | "waiting_confirmation" | "answered_correct" | "answered_wrong" | "round_finished";
  activeTeamId: number | null;
  activeQuestionId: 1 | 2 | 3 | 4 | null;
  timeLeft: number;
  lastAnswerInput: string;
  teamAnswers: Round2TeamAnswer[];
  guessedKeywordCorrect: boolean;
  buzzerPresses: Round2BuzzerPress[];
  buzzerTeamId: number | null;
  buzzerTeamName: string | null;
  buzzerTimestamp: number | null;
  questionStartTime: number | null;
  questionInitialTime: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Round2TeamAnswerSchema = new Schema({
  teamId: { type: Number, required: true },
  teamName: { type: String, required: true },
  answer: { type: String, required: true },
  isCorrect: { type: Schema.Types.Mixed, default: null }, // null, true, or false
  submittedAt: { type: Number, required: true },
}, { _id: false });

const Round2BuzzerPressSchema = new Schema({
  teamId: { type: Number, required: true },
  teamName: { type: String, required: true },
  timestamp: { type: Number, required: true },
}, { _id: false });

const Round2GameStateSchema = new Schema<IRound2GameState>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "current",
    },
    status: {
      type: String,
      enum: ["idle", "tile_selected", "question_open", "waiting_confirmation", "answered_correct", "answered_wrong", "round_finished"],
      default: "idle",
      required: true,
    },
    activeTeamId: { type: Number, default: null },
    activeQuestionId: { type: Number, enum: [1, 2, 3, 4], default: null },
    timeLeft: { type: Number, default: 15 },
    lastAnswerInput: { type: String, default: "" },
    teamAnswers: { type: [Round2TeamAnswerSchema], default: [] },
    guessedKeywordCorrect: { type: Boolean, default: false },
    buzzerPresses: { type: [Round2BuzzerPressSchema], default: [] },
    buzzerTeamId: { type: Number, default: null },
    buzzerTeamName: { type: String, default: null },
    buzzerTimestamp: { type: Number, default: null },
    questionStartTime: { type: Number, default: null },
    questionInitialTime: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất, luôn update document có _id = "current"
interface IRound2GameStateModel extends Model<IRound2GameState> {
  getCurrent(): Promise<IRound2GameState>;
  updateCurrent(updates: Partial<IRound2GameState>): Promise<void>;
}

(Round2GameStateSchema.statics as any).getCurrent = async function() {
  try {
    // Sử dụng findOne với query rõ ràng trên field 'key', không phải '_id'
    let doc = await this.findOne({ key: "current" });
    if (!doc) {
      // Nếu không tìm thấy, thử tạo mới
      try {
        doc = await this.create({
          key: "current",
          status: "idle",
          activeTeamId: null,
          activeQuestionId: null,
          timeLeft: 15,
          lastAnswerInput: "",
          teamAnswers: [],
          guessedKeywordCorrect: false,
          buzzerPresses: [],
          buzzerTeamId: null,
          buzzerTeamName: null,
          buzzerTimestamp: null,
          questionStartTime: null,
          questionInitialTime: null,
        });
      } catch (createError: any) {
        // Nếu bị duplicate key error, có nghĩa là document tồn tại nhưng findOne không tìm thấy
        // Có thể do _id không hợp lệ. Thử xóa tất cả và tạo lại
        if (createError.code === 11000 || (createError.message && createError.message.includes("duplicate key"))) {
          // Xóa tất cả documents (bao gồm cả document có _id không hợp lệ)
          await this.deleteMany({});
          // Tìm lại sau khi xóa
          doc = await this.findOne({ key: "current" });
          if (!doc) {
            // Nếu vẫn không có, tạo mới
            doc = await this.create({
              key: "current",
              status: "idle",
              activeTeamId: null,
              activeQuestionId: null,
              timeLeft: 15,
              lastAnswerInput: "",
              teamAnswers: [],
              guessedKeywordCorrect: false,
              buzzerPresses: [],
              buzzerTeamId: null,
              buzzerTeamName: null,
              buzzerTimestamp: null,
              questionStartTime: null,
              questionInitialTime: null,
            });
          }
        } else {
          throw createError;
        }
      }
    }
    return doc;
  } catch (error: any) {
    // Nếu có lỗi ObjectId, thử xóa tất cả và tạo lại
    if (error.message && error.message.includes("ObjectId")) {
      try {
        await this.deleteMany({});
        return await this.create({
          key: "current",
          status: "idle",
          activeTeamId: null,
          activeQuestionId: null,
          timeLeft: 15,
          lastAnswerInput: "",
          teamAnswers: [],
          guessedKeywordCorrect: false,
          buzzerPresses: [],
          buzzerTeamId: null,
          buzzerTeamName: null,
          buzzerTimestamp: null,
          questionStartTime: null,
          questionInitialTime: null,
        });
      } catch (retryError) {
        throw retryError;
      }
    }
    throw error;
  }
};

(Round2GameStateSchema.statics as any).updateCurrent = async function(updates: Partial<IRound2GameState>) {
  // Sử dụng query rõ ràng trên field 'key', không phải '_id'
  await this.findOneAndUpdate(
    { key: "current" },
    { $set: updates },
    { upsert: true, new: true }
  );
};

// Tạo model nếu chưa tồn tại (tránh lỗi khi hot reload)
const Round2GameStateModel: IRound2GameStateModel = 
  (mongoose.models.Round2GameState as IRound2GameStateModel) || mongoose.model<IRound2GameState, IRound2GameStateModel>("Round2GameState", Round2GameStateSchema);

export default Round2GameStateModel;

