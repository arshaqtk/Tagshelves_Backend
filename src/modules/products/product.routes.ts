import { Router } from "express";
import { getProducts, createProducts } from "./product.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware as any, getProducts as any);
router.post("/", authMiddleware as any, createProducts as any);

export default router;
