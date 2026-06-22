import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./shared/database/connection";
import { errorMiddleware } from "./shared/middlewares/error.middleware";
import router from "./shared/routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database (reload triggered to read new .env)
connectDB();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Routes
app.use(router);

// Error handling middleware
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
