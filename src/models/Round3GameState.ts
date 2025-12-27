import mongoose, { Document, Schema, Model } from "mongoose";
import { Round3GameState, Round3TeamAnswer } from "@/lib/round3/types";

export interface IRound3GameState extends Document {
  key: string;
  status: string;
  activeQuestionId: number | null;
  timeLeft: number;
  teamAnswers: Round3TeamAnswer[];
  questionStartTime: number | null;
  questionInitialTime: number | null;
  currentQuestionIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const Round3TeamAnswerSchema = new Schema({
  teamId: { type: Number, required: true },
  teamName: { type: String, required: true },
  answer: { type: String, required: true },
  isCorrect: { type: Schema.Types.Mixed, default: null }, // null, true, or false
  submittedAt: { type: Number, required: true },
  pointsAwarded: { type: Number, default: 0 },
}, { _id: false });

const Round3GameStateSchema = new Schema<IRound3GameState>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "current",
    },
    status: {
      type: String,
      enum: ["idle", "question_open", "question_closed", "round_finished"],
      default: "idle",
      required: true,
    },
    activeQuestionId: { type: Number, enum: [1, 2, 3, 4], default: null },
    timeLeft: { type: Number, default: 30 },
    teamAnswers: { type: [Round3TeamAnswerSchema], default: [] },
    questionStartTime: { type: Number, default: null },
    questionInitialTime: { type: Number, default: null },
    currentQuestionIndex: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất, luôn update document có _id = "current"
interface IRound3GameStateModel extends Model<IRound3GameState> {
  getCurrent(): Promise<IRound3GameState>;
  updateCurrent(updates: Partial<IRound3GameState>): Promise<void>;
}

(Round3GameStateSchema.statics as any).getCurrent = async function (): Promise<IRound3GameState> {
  let doc = await this.findOne({ key: "current" });
  if (!doc) {
    doc = await this.create({
      key: "current",
      status: "idle",
      activeQuestionId: null,
      timeLeft: 30,
      teamAnswers: [],
      questionStartTime: null,
      questionInitialTime: null,
      currentQuestionIndex: 0,
    });
  }
  return doc;
};

(Round3GameStateSchema.statics as any).updateCurrent = async function (
  updates: Partial<IRound3GameState>
): Promise<void> {
  await this.findOneAndUpdate({ key: "current" }, updates, { upsert: true, new: true });
};

const Round3GameStateModel =
  (mongoose.models.Round3GameState as IRound3GameStateModel & Model<IRound3GameState>) ||
  mongoose.model<IRound3GameState>("Round3GameState", Round3GameStateSchema);

export default Round3GameStateModel;

