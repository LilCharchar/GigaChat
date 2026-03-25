import express from "express";
import dotenv from "dotenv";
import authRoutes from "./auth/routes.js";
import pool from "./config/db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.API_PORT) || 3000;

//midleware
app.use(express.json());

app.use(authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

async function startServer() {
  await pool.query("SELECT 1");
  app.listen(PORT, () => {
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
