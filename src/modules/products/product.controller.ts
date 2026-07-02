import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { ProductService } from "./product.service";
import Product from "./product.model";
import { getDbStats } from "../../shared/utils/dbUtils";

export async function getProducts(
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

    // Parse query parameters
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(1, parseInt((req.query.limit as string) || "10", 10));
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "all";
    const sortBy = (req.query.sortBy as string) || "name";

    // Build the match conditions
    const matchConditions: any = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    // Search filter (matches name or code, case-insensitive)
    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status === "active") {
      matchConditions.status = "active";
    } else if (status === "inactive") {
      matchConditions.status = "inactive";
    }

    // Calculate dynamic lift field for sorting
    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $addFields: {
          lift: {
            $cond: {
              if: { $and: [{ $gt: ["$crossPrice", 0] }, { $ne: ["$crossPrice", null] }] },
              then: {
                $multiply: [
                  { $divide: [{ $subtract: ["$crossPrice", "$promoPrice"] }, "$crossPrice"] },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
    ];

    // Apply sorting
    const sortStage: any = {};
    if (sortBy === "name") {
      sortStage.name = 1;
    } else if (sortBy === "price-asc") {
      sortStage.promoPrice = 1;
    } else if (sortBy === "price-desc") {
      sortStage.promoPrice = -1;
    } else if (sortBy === "lift") {
      sortStage.lift = -1;
    } else {
      sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Get total count of matching products
    const countPipeline = [...pipeline, { $count: "count" }];
    const countResult = await Product.aggregate(countPipeline);
    const totalProducts = countResult[0]?.count || 0;

    // Apply pagination skip and limit
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Execute aggregation
    const rawProducts = await Product.aggregate(pipeline);

    // Map _id to id to match schema expectations
    const products = rawProducts.map((p) => ({
      ...p,
      id: p._id.toString(),
    }));

    // Fetch db stats for organization
    const stats = await getDbStats(organizationId);

    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        totalProducts,
        totalPages,
        page,
        limit,
      },
      stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProducts(
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

    const body = req.body;
    const items = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      res.status(400).json({ success: false, message: "No products provided" });
      return;
    }

    const inserted = await ProductService.createProducts(items, organizationId);

    res.status(201).json({
      success: true,
      message: `${inserted.length} product(s) saved successfully`,
      count: inserted.length,
      products: inserted,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(
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

    const { id } = req.params;
    const body = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(
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

    const { id } = req.params;

    const product = await Product.findOneAndDelete({ _id: id, organizationId });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    next(error);
  }
}
