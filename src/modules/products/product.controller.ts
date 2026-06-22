import { Response, NextFunction } from "express";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { ProductService } from "./product.service";

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

    const products = await ProductService.getProductsByOrg(organizationId);
    res.status(200).json({ success: true, products });
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
    });
  } catch (error) {
    next(error);
  }
}
