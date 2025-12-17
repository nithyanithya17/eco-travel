import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:5500", "http://127.0.0.1:5500"], credentials: true }));
app.use(express.json());

// -----------------------------
// GOOGLE CLIENT
// -----------------------------
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// -----------------------------
// MONGO DB CONNECT
// -----------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));


// -----------------------------
// DB MODEL
// -----------------------------
const HistorySchema = new mongoose.Schema({
  email: String,
  country: String,
  safety: String,
  aqi: Number,
  category: String,
  temperature: Number,
  weather: String,
  flag: String,
  date: { type: Date, default: Date.now }
});

const History = mongoose.model("History", HistorySchema);


// ----------------------------------------------------------
// ✔ GOOGLE LOGIN TOKEN VERIFICATION
// ----------------------------------------------------------
app.post("/api/google-login", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) return res.status(400).json({ error: "Credential missing" });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    return res.json({
      success: true,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });

  } catch (err) {
    console.log("Google Login Error:", err.message);
    return res.status(400).json({ error: "Invalid Google Token" });
  }
});


// ----------------------------------------------------------
// MAIN API: COUNTRY → AQI + WEATHER
// ----------------------------------------------------------
app.get("/api/data", async (req, res) => {
  try {
    const country = req.query.country?.trim();
    if (!country) return res.json({ error: "Country is required" });

    // --- COUNTRY API ---
    const countryRes = await axios.get(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=true`
    );

    const info = countryRes.data[0];
    const flag = info.flags?.png;
    const lat = info.latlng[0];
    const lon = info.latlng[1];

    // --- AQI ---
    let aqiValue = 40;
    let category = "Moderate";

    try {
      const aqiRes = await axios.get(
        `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${process.env.AIRVISUAL_API}`
      );
      aqiValue = aqiRes.data.data.current.pollution.aqius;

      if (aqiValue <= 50) category = "Good";
      else if (aqiValue <= 100) category = "Moderate";
      else if (aqiValue <= 150) category = "Unhealthy (Sensitive)";
      else if (aqiValue <= 200) category = "Unhealthy";
      else category = "Very Unhealthy";

    } catch {
      console.log("AQI API Failed → Using fallback AQI");
    }

    // --- WEATHER ---
    let temperature = 28;
    let weatherStatus = "Clear Sky";

    try {
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API}&units=metric`
      );

      temperature = weatherRes.data.main.temp;
      weatherStatus = weatherRes.data.weather[0].description;
    } catch {
      console.log("Weather API Failed → Using fallback");
    }

    res.json({
      success: true,
      country: info.name.common,
      flag,
      aqi: aqiValue,
      category,
      temperature,
      weather: weatherStatus,
      safety: "Safe to travel"
    });

  } catch (err) {
    console.log("Main API Error:", err.message);
    res.json({ error: "Country not found" });
  }
});


// ----------------------------------------------------------
// SAVE HISTORY
// ----------------------------------------------------------
app.post("/api/save", async (req, res) => {
  try {
    const entry = await History.create(req.body);
    res.json({ success: true, entry });
  } catch {
    res.json({ error: "Save failed" });
  }
});


// ----------------------------------------------------------
// LOAD HISTORY
// ----------------------------------------------------------
app.get("/api/history", async (req, res) => {
  try {
    const email = req.query.email;
    const history = await History.find({ email }).sort({ date: -1 });
    res.json(history);
  } catch {
    res.json({ error: "Cannot load history" });
  }
});


// ----------------------------------------------------------
// START SERVER (FIXED VERSION)
// ----------------------------------------------------------
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

