import { io } from "../index.js";
import { Company } from "../models/Company.js";
import { sendEmail } from "./email.service.js";

export async function processCovenantAlerts(companyId) {
  console.log("\n\n================ ALERT ENGINE START ================");
  console.log("🏢 Company ID:", companyId);

  const company = await Company.findOne({ companyId });
  if (!company) {
    console.log("❌ Company not found");
    return null;
  }

  // 🔥 STEP 0: RAW INPUT
  console.log("📊 ALL COVENANTS:", company.covenants);

  // 1. detect alerts
  const alerts = (company.covenants || [])
    .filter((c) => c.status === "BREACH" || c.status === "WARNING")
    .map((c) => {
      const covenantId = c.id || c._id;

      return {
        id: `${companyId}:${covenantId}:${c.status}`,
        date: new Date(),
        covenantName: c.name,
        status: c.status,
        value: Number(c.value),
        acknowledged: false,
      };
    });

  // 🔥 STEP 1: AFTER FILTERING
  console.log("🚨 FILTERED ALERTS:", alerts);
  console.log("📌 Filtered count:", alerts.length);

  if (!alerts.length) {
    console.log("⚠️ No BREACH/WARNING alerts found");
    return { alerts: [] };
  }

  // 2. prevent duplicates BEFORE saving
  const existingIds = new Set((company.alerts || []).map((a) => a.id));

  console.log("🧠 Existing alert IDs:", Array.from(existingIds));

  const newAlerts = alerts.filter((a) => !existingIds.has(a.id));

  // 🔥 STEP 2: AFTER DEDUPE
  console.log("🆕 NEW ALERTS AFTER DEDUPE:", newAlerts);
  console.log("📌 New alerts count:", newAlerts.length);

  if (!newAlerts.length) {
    console.log("⚠️ All alerts already exist (deduplication blocked them)");
    return { alerts: [] };
  }

  // 3. save to DB safely
  company.alerts = [...(company.alerts || []), ...newAlerts];

  console.log("💾 Saving alerts to DB...");
  await company.save();
  console.log("✅ DB saved successfully");

  // 4. REAL-TIME WEBSOCKET 🔥
  console.log("📡 Emitting socket event: covenant-alerts");
  console.log("🏢 Room:", companyId);

  io.to(companyId).emit("covenant-alerts", newAlerts);

  console.log("📤 Emission complete");

  // 5. EMAIL
  if (company.ownerEmail) {
    console.log("📧 Sending email to:", company.ownerEmail);

    await sendEmail({
      to: company.ownerEmail,
      subject: `🚨 Covenant Alert - ${company.name}`,
      html: `
        <h2>Covenant Alert</h2>
        <p>Following covenants are in risk:</p>
        <ul>
          ${newAlerts
            .map((a) => `${a.covenantName}: ${a.status} (${a.value})`)
            .join("")}
        </ul>
      `,
    });

    console.log("📧 Email sent successfully");
  }

  console.log("================ ALERT ENGINE END ================\n\n");

  return { alerts: newAlerts };
}