import bcrypt from "bcryptjs";
import User, { IUser } from "./user.model";
import { createOrganization } from "../organizations/organization.service";
import { IOrganization } from "../organizations/organization.model";

export async function registerOrganizationAndOwner(
  name: string,
  email: string,
  password: string,
  orgName?: string,
  accountType?: "Business" | "Individual",
  isPasswordHashed = false
): Promise<{ user: IUser; organization: IOrganization }> {
  const emailLower = email.toLowerCase();

  // Check if user already exists
  const existingUser = await User.findOne({ email: emailLower });
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Hash password if not already hashed
  let hashedPassword = password;
  if (!isPasswordHashed) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  }

  // Create organization with email and hashed password
  const finalOrgName =
    orgName || (accountType === "Business" ? `${name}'s Business` : `${name}'s Personal`);
  const organization = await createOrganization(
    finalOrgName,
    emailLower,
    hashedPassword,
    "free"
  );

  // Create user with "owner" role
  const user = await User.create({
    name,
    email: emailLower,
    password: hashedPassword,
    organizationId: organization._id,
    accountType,
    role: "owner",
  });

  return { user, organization };
}

export async function addUserToOrganization(
  name: string,
  email: string,
  password: string,
  organizationId: string,
  role: "owner" | "member" = "member"
): Promise<IUser> {
  const emailLower = email.toLowerCase();

  // Check if user already exists
  const existingUser = await User.findOne({ email: emailLower });
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    name,
    email: emailLower,
    password: hashedPassword,
    organizationId,
    role,
  });

  return user;
}

export async function loginUser(email: string, password: string): Promise<IUser> {
  const emailLower = email.toLowerCase();

  // Find user
  const user = await User.findOne({ email: emailLower });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  return user;
}

export async function getUsersByOrg(organizationId: string): Promise<IUser[]> {
  return await User.find({ organizationId }).select("-password");
}

export async function getUserByEmail(email: string): Promise<IUser | null> {
  return await User.findOne({ email: email.toLowerCase() }).select("-password");
}

export async function updateUserProfile(
  email: string,
  updates: { name?: string; profilePic?: string }
): Promise<IUser | null> {
  const emailLower = email.toLowerCase();
  return await User.findOneAndUpdate(
    { email: emailLower },
    { $set: updates },
    { new: true }
  ).select("-password");
}
