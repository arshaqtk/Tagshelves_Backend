import { Response, NextFunction } from "express";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import Product from "../products/product.model";
import User from "../users/user.model";
import Organization from "../organizations/organization.model";
import { getDashboardMetrics, getDbStats } from "../../shared/utils/dbUtils";

function serializeProduct(p: any) {
  return {
    id: p._id.toString(),
    name: p.name,
    code: p.code,
    promoPrice: p.promoPrice,
    crossPrice: p.crossPrice,
    validUntil: p.validUntil ? new Date(p.validUntil).toISOString() : null,
    offer: p.offer ?? null,
    status: p.status === "inactive" ? "inactive" : "active",
  };
}

function serializeUser(u: any) {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    accountType: u.accountType ?? "Individual",
    profilePic: u.profilePic ?? "",
  };
}

export async function getDashboardSummary(
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

    const [organization, products, metrics, users] = await Promise.all([
      Organization.findById(organizationId).select("name plan").lean(),
      Product.find({ organizationId }).sort({ createdAt: -1 }).limit(3).lean(),
      getDashboardMetrics(organizationId),
      User.find({ organizationId }).select("name email role accountType profilePic").lean(),
    ]);

    const org = organization as any;
    const productDocs = products as any[];
    const userDocs = (users || []) as any[];

    res.status(200).json({
      success: true,
      organizationName: org?.name ?? "Target Australia",
      organizationPlan: org?.plan ?? "free",
      userEmail: req.user?.email,
      products: productDocs.map(serializeProduct),
      metrics,
      users: userDocs.map(serializeUser),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCampaignsSummary(
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

    const limit = 10;
    const [organization, products, totalProducts, stats, users] = await Promise.all([
      Organization.findById(organizationId).select("name plan").lean(),
      Product.find({ organizationId }).sort({ createdAt: -1 }).limit(limit).lean(),
      Product.countDocuments({ organizationId }),
      getDbStats(organizationId),
      User.find({ organizationId }).select("name email role accountType profilePic").lean(),
    ]);

    const org = organization as any;
    const productDocs = products as any[];
    const userDocs = (users || []) as any[];

    res.status(200).json({
      success: true,
      organizationName: org?.name ?? "Target Australia",
      organizationPlan: org?.plan ?? "free",
      userEmail: req.user?.email,
      initialProducts: productDocs.map(serializeProduct),
      initialTotalProducts: totalProducts,
      initialLimit: limit,
      initialStats: stats,
      users: userDocs.map(serializeUser),
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfileSummary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const email = req.user?.email;
    if (!organizationId || !email) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const [organization, products, userDoc] = await Promise.all([
      Organization.findById(organizationId).select("name plan").lean(),
      Product.find({ organizationId }).sort({ createdAt: -1 }).lean(),
      User.findOne({ email }).select("name email role accountType profilePic").lean(),
    ]);

    const org = organization as any;
    const productDocs = products as any[];
    const user = userDoc as any;

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      organizationName: org?.name ?? "Target Australia",
      organizationPlan: org?.plan ?? "free",
      userEmail: email,
      products: productDocs.map(serializeProduct),
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
}
