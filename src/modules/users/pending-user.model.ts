import mongoose, { Schema, Document } from "mongoose";

export interface IPendingUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  orgName?: string;
  accountType?: "Business" | "Individual";
  otp: string;
  otpExpires: Date;
  createdAt: Date;
}

const pendingUserSchema = new Schema<IPendingUser>(
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
    passwordHash: {
      type: String,
      required: true,
    },
    orgName: {
      type: String,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ["Business", "Individual"],
      default: "Individual",
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpires: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Add TTL index on otpExpires to automatically clean up documents after expiration
pendingUserSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingUser || mongoose.model<IPendingUser>("PendingUser", pendingUserSchema);
