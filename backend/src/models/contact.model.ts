import mongoose, { Schema, model, models } from "mongoose";

export interface IContactMessage {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  resolved: boolean;
  createdAt: Date;
}

const ContactSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ContactMessage = models.ContactMessage || model<IContactMessage>("ContactMessage", ContactSchema);
