import mongoose, { Document, Schema, Model } from "mongoose";
import { Round4GameState, Round4TeamAnswer, Round4BuzzerPress } from "@/lib/round4/types";

export interface IRound4GameState extends Document {
  key: string;
  status: string;
  currentPackageType: number | null;
  currentQuestionId: string | null;
  currentMainTeamId: number | null;
  timeLeft: number;
  questionStartTime: number | null;
  questionInitialTime: number | null;
  buzzerWindowStartTime: number | null;
  buzzerWindowTimeLeft: number;
  buzzerPresses: Round4BuzzerPress[];
  teamAnswers: Round4TeamAnswer[];
  hopeStarTeams: number[];
  currentQuestionIndex: number;
  currentPackageIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const Round4BuzzerPressSchema = new Schema({
  teamId: { type: Number, required: true },
  teamName: { type: String, required: true },
  timestamp: { type: Number, required: true },
}, { _id: false });

const Round4TeamAnswerSchema = new Schema({
  teamId: { type: Number, required: true },
  teamName: { type: String, required: true },
  answer: { type: String, required: true },
  isCorrect: { type: Schema.Types.Mixed, default: null },
  submittedAt: { type: Number, required: true },
  isMainTeam: { type: Boolean, required: true },
  isHopeStar: { type: Boolean, default: false },
  pointsAwarded: { type: Number, default: 0 },
  isFinalAnswer: { type: Boolean, default: true },
}, { _id: false });

const Round4GameStateSchema = new Schema<IRound4GameState>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "current",
    },
    status: {
      type: String,
      enum: ["idle", "team_selection", "package_selection_by_mc", "question_preparing", "question_open", "waiting_mc_judgment", "buzzer_window", "waiting_answer", "answer_revealed", "round_finished"],
      default: "idle",
      required: true,
    },
    currentPackageType: { type: Number, enum: [40, 60, 80], default: null },
    currentQuestionId: { type: String, default: null },
    currentMainTeamId: { type: Number, default: null },
    timeLeft: { type: Number, default: 20 },
    questionStartTime: { type: Number, default: null },
    questionInitialTime: { type: Number, default: null },
    buzzerWindowStartTime: { type: Number, default: null },
    buzzerWindowTimeLeft: { type: Number, default: 5 },
    buzzerPresses: { type: [Round4BuzzerPressSchema], default: [] },
    teamAnswers: { type: [Round4TeamAnswerSchema], default: [] },
    hopeStarTeams: { type: [Number], default: [] },
    currentQuestionIndex: { type: Number, default: 0 },
    currentPackageIndex: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất
interface IRound4GameStateModel extends Model<IRound4GameState> {
  getCurrent(): Promise<IRound4GameState>;
  updateCurrent(updates: Partial<IRound4GameState>): Promise<void>;
}

(Round4GameStateSchema.statics as any).getCurrent = async function (): Promise<IRound4GameState> {
  let doc = await this.findOne({ key: "current" });
  if (!doc) {
    doc = await this.create({
      key: "current",
      status: "idle",
      currentPackageType: null,
      currentQuestionId: null,
      currentMainTeamId: null,
      timeLeft: 20,
      questionStartTime: null,
      questionInitialTime: null,
      buzzerWindowStartTime: null,
      buzzerWindowTimeLeft: 5,
      buzzerPresses: [],
      teamAnswers: [],
      hopeStarTeams: [],
      currentQuestionIndex: 0,
      currentPackageIndex: 0,
    });
  }
  return doc;
};

(Round4GameStateSchema.statics as any).updateCurrent = async function (
  updates: Partial<IRound4GameState>
): Promise<void> {
  await this.findOneAndUpdate({ key: "current" }, updates, { upsert: true, new: true });
};

const Round4GameStateModel =
  (mongoose.models.Round4GameState as IRound4GameStateModel & Model<IRound4GameState>) ||
  mongoose.model<IRound4GameState>("Round4GameState", Round4GameStateSchema);

export default Round4GameStateModel;

