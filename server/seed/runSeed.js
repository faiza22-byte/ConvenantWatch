import bcrypt from "bcryptjs";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { SEED_COMPANIES, SEED_USERS } from "./companies.js";

export async function seedDatabase() {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return;
  }

  console.log("Seeding database with demo companies and users…");

  await Company.insertMany(SEED_COMPANIES);

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({
      email: u.email,
      passwordHash,
      role: u.role,
      companyId: u.companyId,
      fullName: u.fullName,
    });
  }

  console.log("Seed complete");
}
