import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { buildStarterCompany, slugifyCompanyId, toPublicUser } from "../utils/companyFactory.js";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      companyName,
      jobTitle = "",
      phone = "",
      industry = "",
    } = req.body;

    if (!email || !password || !fullName || !companyName) {
      return res.status(400).json({ message: "Email, password, full name, and company name are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const companyId = slugifyCompanyId(companyName);
    const companyDoc = buildStarterCompany({
      companyId,
      name: String(companyName).trim(),
      industry,
    });

    await Company.create(companyDoc);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: "company",
      companyId,
      fullName: String(fullName).trim(),
      jobTitle,
      phone,
      industry,
    });

    const token = signToken(user._id);
    const publicUser = toPublicUser(user, companyDoc.name);

    res.status(201).json({ user: publicUser, token });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Failed to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    let companyName;
    if (user.companyId) {
      const company = await Company.findOne({ companyId: user.companyId });
      companyName = company?.name;
    }

    const token = signToken(user._id);
    res.json({ user: toPublicUser(user, companyName), token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  let companyName;
  if (req.user.companyId) {
    const company = await Company.findOne({ companyId: req.user.companyId });
    companyName = company?.name;
  }
  res.json({ user: toPublicUser(req.user, companyName) });
});

export default router;
