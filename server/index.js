import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { connectDb } from "./config/db.js";
import "./config/loadEnv.js";

import { startQuickBooksCron } from "./jobs/quickbooksCron.js";

import alertRoutes from "./routes/Alerts.js";
import authRoutes from "./routes/auth.js";
import companyRoutes from "./routes/companies.js";
import loanAgreementRoutes from "./routes/loanAgreements.js";
import quickbooksRoutes from "./routes/quickbooks.js";
import ragRoutes from "./routes/ragRoutes.js";
import syncRoutes from "./routes/sync.js";
import { seedDatabase } from "./seed/runSeed.js";

/* =========================
   EXPRESS APP
========================= */
const app = express();
const port = Number(process.env.PORT) || 5000;

/* =========================
   HTTP SERVER (IMPORTANT)
========================= */
const server = http.createServer(app);

/* =========================
   SOCKET.IO SETUP
========================= */
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  },
});

/* =========================
   SOCKET EVENTS
========================= */
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // join company room for real-time alerts
  socket.on("join-company", (companyId) => {
  socket.join(companyId);
  console.log(`📦 Joined company room: ${companyId}`);
});

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "covenant-api" });
});

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/integrations/quickbooks", quickbooksRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/companies", loanAgreementRoutes);
app.use("/api/alerts", alertRoutes);

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, _req, res, _next) => {
  console.error("🔥 SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    message: err?.message || "Internal server error",
  });
});

/* =========================
   START SERVER
========================= */
async function start() {
  try {
    console.log("PORT:", port);

    await connectDb();
    console.log("🟢 DB connected");

    if (process.env.NODE_ENV === "development") {
      await seedDatabase();
      console.log("🌱 Seed complete");
    }

    startQuickBooksCron();
    console.log("⏰ Cron started");

    // 🔥 IMPORTANT: use HTTP server instead of app.listen
    server.listen(port, () => {
      console.log(`🚀 API + SOCKET running: http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();