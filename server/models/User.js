import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "company"], required: true },
    companyId: { type: String, default: null },
    fullName: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    phone: { type: String, default: "" },
    industry: { type: String, default: "" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
