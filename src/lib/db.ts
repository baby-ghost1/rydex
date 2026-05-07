// lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env");
}



let cached = global.mongooseCache 
if(!cached){
  cached = global.mongooseCache={conn:null, promise:null}
}

const connectDB = async() => {
  if(cached.conn){
    return cached.conn
  }

  if(!cached.promise){
    cached.promise = mongoose.connect(MONGODB_URI).then(() => mongoose.connection)
  }

  try{
    const conn = await cached.promise
    return conn
  }catch(error){
    console.log(error)
  }
}

export default connectDB;