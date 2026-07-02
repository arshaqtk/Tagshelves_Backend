import { Router } from "express";
import { getDashboardSummary, getCampaignsSummary, getProfileSummary } from "./summary.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.get("/dashboard/summary", authMiddleware as any, getDashboardSummary as any);
router.get("/campaigns/summary", authMiddleware as any, getCampaignsSummary as any);
router.get("/profile/summary", authMiddleware as any, getProfileSummary as any);

export default router;
