import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  email: string;
  password: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", organizationSchema);
