import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { dbName: "covenantwatch" });
  console.log("Connected to MongoDB Atlas");
}
