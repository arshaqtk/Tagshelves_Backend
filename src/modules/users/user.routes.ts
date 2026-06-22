import { Router } from "express";
import multer from "multer";
import {
  register,
  login,
  logout,
  createUser,
  getUsers,
  getProfile,
  updateProfile,
  uploadProfilePic,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  resendResetOtp,
} from "./user.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-reset-otp", resendResetOtp);
router.post("/login", login);
router.get("/logout", logout);
router.post("/users", authMiddleware, createUser);
router.get("/users", authMiddleware, getUsers);

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/profile/upload", authMiddleware, upload.single("file"), uploadProfilePic);

export default router;
