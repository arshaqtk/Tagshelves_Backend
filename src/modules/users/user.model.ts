import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  organizationId: mongoose.Types.ObjectId;
  accountType?: "Business" | "Individual";
  role: "owner" | "member";
  profilePic?: string;
  resetPasswordOtp?: string | null;
  resetPasswordOtpExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
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
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountType: {
      type: String,
      enum: ["Business", "Individual"],
      default: "Individual",
    },
    role: {
      type: String,
      enum: ["owner", "member"],
      default: "member",
    },
    profilePic: {
      type: String,
      default: "",
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>("User", userSchema);
