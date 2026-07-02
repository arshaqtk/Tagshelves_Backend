import { Router } from "express";
import { getProducts, createProducts, updateProduct, deleteProduct } from "./product.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware as any, getProducts as any);
router.post("/", authMiddleware as any, createProducts as any);
router.put("/:id", authMiddleware as any, updateProduct as any);
router.delete("/:id", authMiddleware as any, deleteProduct as any);

export default router;
