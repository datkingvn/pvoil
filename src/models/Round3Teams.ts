import mongoose, { Document, Schema, Model } from "mongoose";
import { Round3Team } from "@/lib/round3/types";

export interface IRound3Teams extends Document {
  key: string;
  teams: Round3Team[];
  createdAt: Date;
  updatedAt: Date;
}

const Round3TeamSchema = new Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
}, { _id: false });

const Round3TeamsSchema = new Schema<IRound3Teams>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "current",
    },
    teams: { type: [Round3TeamSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất
Round3TeamsSchema.index({ key: 1 }, { unique: true });

interface IRound3TeamsModel extends Model<IRound3Teams> {
  getCurrent(): Promise<IRound3Teams>;
  updateCurrent(teams: Round3Team[]): Promise<void>;
}

(Round3TeamsSchema.statics as any).getCurrent = async function (): Promise<IRound3Teams> {
  let doc = await this.findOne({ key: "current" });
  if (!doc) {
    doc = await this.create({
      key: "current",
      teams: [],
    });
  }
  return doc;
};

(Round3TeamsSchema.statics as any).updateCurrent = async function (
  teams: Round3Team[]
): Promise<void> {
  await this.findOneAndUpdate({ key: "current" }, { teams }, { upsert: true, new: true });
};

const Round3TeamsModel =
  (mongoose.models.Round3Teams as IRound3TeamsModel & Model<IRound3Teams>) ||
  mongoose.model<IRound3Teams>("Round3Teams", Round3TeamsSchema);

export default Round3TeamsModel;

