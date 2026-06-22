import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import {
  registerOrganizationAndOwner,
  addUserToOrganization,
  loginUser,
  getUsersByOrg,
  getUserByEmail,
  updateUserProfile,
} from "./user.service";
import { uploadImage } from "../../shared/utils/cloudinary";
import { signToken } from "../../shared/utils/jwt";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import PendingUser from "./pending-user.model";
import User from "./user.model";
import { sendOtpEmail, sendResetPasswordEmail } from "../../shared/utils/mail";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password, orgName, accountType } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
      return;
    }

    // Password strength rules
    const uppercaseRegExp   = /(?=.*[A-Z])/;
    const lowercaseRegExp   = /(?=.*[a-z])/;
    const digitsRegExp      = /(?=.*?[0-9])/;
    const specialCharRegExp = /(?=.*?[#?!@$%^&*-])/;

    if (password.length < 8 || 
        !uppercaseRegExp.test(password) || 
        !lowercaseRegExp.test(password) || 
        !digitsRegExp.test(password) || 
        !specialCharRegExp.test(password)) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
      return;
    }

    const emailLower = email.toLowerCase();

    // Check if user already exists
    const existingUser = await getUserByEmail(emailLower);
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save or update pending user details
    await PendingUser.findOneAndUpdate(
      { email: emailLower },
      {
        name,
        passwordHash: hashedPassword,
        orgName,
        accountType,
        otp,
        otpExpires,
      },
      { upsert: true, new: true }
    );

    // Send OTP email
    await sendOtpEmail(emailLower, otp);

    res.status(200).json({
      success: true,
      message: "A 6-digit verification code has been sent to your email.",
    });
  } catch (error: any) {
    next(error);
  }
}

export async function verifyOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Please provide email and verification code",
      });
      return;
    }

    const emailLower = email.toLowerCase();

    // Find pending user record
    const pendingUser = await PendingUser.findOne({ email: emailLower });
    if (!pendingUser) {
      res.status(400).json({
        success: false,
        message: "Verification code not found or expired. Please sign up again.",
      });
      return;
    }

    // Check if OTP matches
    if (pendingUser.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
      return;
    }

    // Check if OTP is expired
    if (pendingUser.otpExpires.getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one.",
      });
      return;
    }

    // Complete registration
    const { user, organization } = await registerOrganizationAndOwner(
      pendingUser.name,
      pendingUser.email,
      pendingUser.passwordHash,
      pendingUser.orgName,
      pendingUser.accountType,
      true // isPasswordHashed
    );

    // Delete pending record
    await PendingUser.deleteOne({ email: emailLower });

    // Generate token
    const token = signToken({
      email: user.email,
      organizationId: organization._id.toString(),
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    });

    res.status(201).json({
      success: true,
      message: "Registration and email verification successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organizationId: organization._id,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.message === "A user with this email already exists") {
      res.status(400).json({ success: false, message: error.message });
    } else {
      next(error);
    }
  }
}

export async function resendOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
      return;
    }

    const emailLower = email.toLowerCase();

    // Check if already registered
    const existingUser = await getUserByEmail(emailLower);
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "This email is already registered and verified.",
      });
      return;
    }

    // Find pending record
    const pendingUser = await PendingUser.findOne({ email: emailLower });
    if (!pendingUser) {
      res.status(400).json({
        success: false,
        message: "No registration pending for this email. Please sign up first.",
      });
      return;
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    pendingUser.otp = otp;
    pendingUser.otpExpires = otpExpires;
    await pendingUser.save();

    // Send email
    await sendOtpEmail(emailLower, otp);

    res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email.",
    });
  } catch (error: any) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
      return;
    }

    const user = await loginUser(email, password);

    // Generate token
    const token = signToken({
      email: user.email,
      organizationId: user.organizationId.toString(),
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.message === "Invalid email or password") {
      res.status(400).json({ success: false, message: error.message });
    } else {
      next(error);
    }
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie("token");
  res.redirect("/login");
}

export async function createUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide name, email, and password for the user",
      });
      return;
    }

    const newUser = await addUserToOrganization(
      name,
      email,
      password,
      organizationId,
      role || "member"
    );

    res.status(201).json({
      success: true,
      message: "User created successfully under your organization",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        organizationId: newUser.organizationId,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    if (error.message === "A user with this email already exists") {
      res.status(400).json({ success: false, message: error.message });
    } else {
      next(error);
    }
  }
}

export async function getUsers(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const users = await getUsersByOrg(organizationId);
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await getUserByEmail(email);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        profilePic: user.profilePic || "",
        organizationId: user.organizationId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { name, profilePic } = req.body;
    const updates: { name?: string; profilePic?: string } = {};
    if (name !== undefined) updates.name = name;
    if (profilePic !== undefined) updates.profilePic = profilePic;

    const updatedUser = await updateUserProfile(email, updates);
    if (!updatedUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        accountType: updatedUser.accountType,
        profilePic: updatedUser.profilePic || "",
        organizationId: updatedUser.organizationId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadProfilePic(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const url = await uploadImage(req.file.buffer, req.file.mimetype, "profiles");

    res.status(200).json({
      success: true,
      url,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
      return;
    }

    const emailLower = email.toLowerCase();

    // Check if user exists
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "No user found with this email address",
      });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user record
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    // Send reset OTP email
    await sendResetPasswordEmail(emailLower, otp);

    res.status(200).json({
      success: true,
      message: "A 6-digit password reset code has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Please provide email, verification code, and new password",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
      return;
    }

    const emailLower = email.toLowerCase();

    // Find user
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "No user found with this email address",
      });
      return;
    }

    // Check if OTP matches and is not expired
    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
      return;
    }

    if (!user.resetPasswordOtpExpires || user.resetPasswordOtpExpires.getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one.",
      });
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password and clear OTP
    user.password = hashedPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    next(error);
  }
}

export async function resendResetOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
      return;
    }

    const emailLower = email.toLowerCase();

    // Find user
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "No user found with this email address",
      });
      return;
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Update user record
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    // Send reset OTP email
    await sendResetPasswordEmail(emailLower, otp);

    res.status(200).json({
      success: true,
      message: "A new password reset code has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
}
