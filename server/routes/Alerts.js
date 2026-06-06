import express from "express";
import { triggerCovenantAlerts } from "../controllers/alerts.controller.js";

const router = express.Router();

router.post("/alerts/covenants/trigger", triggerCovenantAlerts);

export default router;