// model.js
import mongoose from "mongoose";

const recordSchema = new mongoose.Schema({
  country: String,
  flag: String,
  region: String,
  capital: String,
  population: Number,
  travelSafety: {
    score: Number,
    advisory: String
  },
  airQuality: mongoose.Mixed,
  weather: mongoose.Mixed
}, { timestamps: true });

export default mongoose.model("Record", recordSchema);
