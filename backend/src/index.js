import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import authRoutes from "./auth/routes.js";
import friendshipRoutes from "./friendships/routes.js";
import chatRoutes from "./chats/routes.js";
import pool from "./config/db.js";
import { initRealtime } from "./realtime/index.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.API_PORT) || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// middleware
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use(authRoutes);
app.use(friendshipRoutes);
app.use(chatRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

initRealtime({ httpServer, frontendOrigin: FRONTEND_ORIGIN });

async function startServer() {
  await pool.query("SELECT 1");
  httpServer.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
  });
}

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

startServer().catch((error) => {
  console.error(`Error starting server: ${error.message}`);
  process.exit(1);
});
