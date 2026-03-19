import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment variables");
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);

    const message = String(error?.message || "").toLowerCase();
    if (message.includes("authentication failed") || message.includes("bad auth")) {
      console.error("ℹ️ MongoDB Atlas auth failed. Verify username/password in MONGODB_URI and ensure the DB user exists with proper roles.");
    }
    if (message.includes("enotfound") || message.includes("eai_again")) {
      console.error("ℹ️ DNS/network issue. Verify internet access and MongoDB Atlas SRV host.");
    }

    process.exit(1);
  }
};

export default connectDB;
