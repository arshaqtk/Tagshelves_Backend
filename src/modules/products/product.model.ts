import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  code: string;
  promoPrice: number;
  crossPrice?: number;
  validUntil?: Date;
  offer?: string;
  status: "active" | "inactive";
  organizationId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    promoPrice: {
      type: Number,
      required: true,
    },
    crossPrice: {
      type: Number,
    },
    validUntil: {
      type: Date,
    },
    offer: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Product ||
  mongoose.model<IProduct>("Product", productSchema);
