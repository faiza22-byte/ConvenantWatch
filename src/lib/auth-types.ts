export interface AuthUser {
  email: string;
  role: "admin" | "company";
  companyId?: string;
  companyName?: string;
  fullName?: string;
}
