import express from "express";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRoutes from "./routes/friend.route.js";
import webrtcRoutes from "./routes/webrtc.route.js";
import dotenv from "dotenv";
import {connectDB} from "./lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "./lib/socket.js";
import { protectRoute } from "./middleware/auth.middleware.js";
import { parseVoice } from "./controllers/voice.controller.js";

dotenv.config();

const PORT = process.env.PORT;

app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true, // If you're using cookies or sessions
  }));

app.use(express.json());
app.use(cookieParser());

// Sanity check (no auth) — if this 404s, you are not hitting this server process
app.get("/api/health", (req, res) => {
    res.status(200).json({ ok: true });
});

// Voice intent (registered on app directly so POST /api/parse-voice always resolves)
app.post("/api/parse-voice", protectRoute, parseVoice);

app.use("/api/auth",authRoutes);
app.use("/api/messages",messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/webrtc", webrtcRoutes);



server.listen(PORT,()=>{
    console.log("server is running on PORT:"+PORT);
    connectDB();
});