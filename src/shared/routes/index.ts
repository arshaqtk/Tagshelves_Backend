import { Router } from "express";
import userRouter from "../../modules/users/user.routes";
import productRouter from "../../modules/products/product.routes";
import summaryRouter from "../../modules/summary/summary.routes";

const router = Router();

router.use("/api/auth", userRouter);
router.use("/api/products", productRouter);
router.use("/api", summaryRouter);

export default router;
