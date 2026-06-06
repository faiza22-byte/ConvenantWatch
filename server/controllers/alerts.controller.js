import { processCovenantAlerts } from "../services/covenantAlertEngine.service.js";

export async function triggerCovenantAlerts(req, res) {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    const result = await processCovenantAlerts(companyId);

    return res.json({
      success: true,
      alertsCreated: result?.alerts?.length || 0,
      alerts: result?.alerts || [],
    });
  } catch (err) {
    console.error("❌ triggerCovenantAlerts error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
}
}