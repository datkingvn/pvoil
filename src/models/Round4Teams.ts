import mongoose, { Document, Schema, Model } from "mongoose";
import { Round4Team } from "@/lib/round4/types";

export interface IRound4Teams extends Document {
  key: string;
  teams: Round4Team[];
  createdAt: Date;
  updatedAt: Date;
}

const Round4TeamSchema = new Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  hasUsedHopeStar: { type: Boolean, default: false },
  selectedPackage: { type: Number, enum: [40, 60, 80], default: null },
  packageOrder: { type: Number, default: null },
}, { _id: false });

const Round4TeamsSchema = new Schema<IRound4Teams>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "current",
    },
    teams: { type: [Round4TeamSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Chỉ lưu 1 document duy nhất
Round4TeamsSchema.index({ key: 1 }, { unique: true });

interface IRound4TeamsModel extends Model<IRound4Teams> {
  getCurrent(): Promise<IRound4Teams>;
  updateCurrent(teams: Round4Team[]): Promise<void>;
}

(Round4TeamsSchema.statics as any).getCurrent = async function (): Promise<IRound4Teams> {
  let doc = await this.findOne({ key: "current" });
  if (!doc) {
    doc = await this.create({
      key: "current",
      teams: [],
    });
  }
  return doc;
};

(Round4TeamsSchema.statics as any).updateCurrent = async function (
  teams: Round4Team[]
): Promise<void> {
  await this.findOneAndUpdate({ key: "current" }, { teams }, { upsert: true, new: true });
};

const Round4TeamsModel =
  (mongoose.models.Round4Teams as IRound4TeamsModel & Model<IRound4Teams>) ||
  mongoose.model<IRound4Teams>("Round4Teams", Round4TeamsSchema);

export default Round4TeamsModel;

