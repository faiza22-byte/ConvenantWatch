import jwt from "jsonwebtoken";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signQbOAuthState({ companyId, returnPath = "/dashboard" }) {
  return jwt.sign({ companyId, returnPath, purpose: "qb_oauth" }, getJwtSecret(), {
    expiresIn: "15m",
  });
}

export function verifyQbOAuthState(token) {
  const payload = jwt.verify(token, getJwtSecret());
  if (payload.purpose !== "qb_oauth" || !payload.companyId) {
    throw new Error("Invalid OAuth state");
  }
  return {
    companyId: payload.companyId,
    returnPath: payload.returnPath || "/dashboard",
  };
}
