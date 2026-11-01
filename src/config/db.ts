import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

export async function closeDb() { await mongoose.disconnect(); }
export function dbReady() { return mongoose.connection.readyState === 1; }
