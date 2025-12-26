import mongoose, { Schema, Document, Model } from "mongoose";
import { Round2Team } from "@/lib/round2/types";

export interface IRound2Teams extends Document {
  key: string; // Unique key để identify document duy nhất (sẽ là "current")
  teams: Round2Team[];
  createdAt: Date;
  updatedAt: Date;
}

const Round2TeamSchema = new Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
}, { _id: false });

const Round2TeamsSchema = new Schema<IRound2Teams>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "current",
    },
    teams: {
      type: [Round2TeamSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất, luôn update document có _id = "current"
interface IRound2TeamsModel extends Model<IRound2Teams> {
  getCurrent(): Promise<IRound2Teams>;
  updateCurrent(teams: Round2Team[]): Promise<void>;
}

(Round2TeamsSchema.statics as any).getCurrent = async function() {
  let doc = await this.findOne({ key: "current" });
  if (!doc) {
    doc = await this.create({
      key: "current",
      teams: [],
    });
  }
  return doc;
};

(Round2TeamsSchema.statics as any).updateCurrent = async function(teams: Round2Team[]) {
  await this.findOneAndUpdate(
    { key: "current" },
    { $set: { teams } },
    { upsert: true, new: true }
  );
};

// Tạo model nếu chưa tồn tại (tránh lỗi khi hot reload)
const Round2TeamsModel: IRound2TeamsModel = 
  (mongoose.models.Round2Teams as IRound2TeamsModel) || mongoose.model<IRound2Teams, IRound2TeamsModel>("Round2Teams", Round2TeamsSchema);

export default Round2TeamsModel;

