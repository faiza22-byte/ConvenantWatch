/**
 * Prints the Intuit OAuth URL. After authorizing, exchange the code at:
 * https://developer.intuit.com/app/developer/playground
 * Then add QUICKBOOKS_REALM_ID and QUICKBOOKS_REFRESH_TOKEN to .env
 */
import "../config/loadEnv.js";
import { qbConfig } from "../config/quickbooks.js";

if (!qbConfig.clientId) {
  console.error("Set QUICKBOOKS_CLIENT_ID (or Client_ID) in .env first.");
  process.exit(1);
}

const scope = "com.intuit.quickbooks.accounting";
const base =
  qbConfig.environment === "production"
    ? "https://appcenter.intuit.com/connect/oauth2"
    : "https://appcenter.intuit.com/connect/oauth2";

const params = new URLSearchParams({
  client_id: qbConfig.clientId,
  redirect_uri: qbConfig.redirectUri,
  response_type: "code",
  scope,
  state: "covenantwatch",
});

console.log("\nOpen this URL to authorize QuickBooks:\n");
console.log(`${base}?${params}`);
console.log("\nAfter redirect, copy realmId + refresh token into .env (see ENV_SETUP.md).\n");
