import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Company } from "@/lib/mock-data";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { companies } = await api.getCompanies();
      return companies;
    },
  });
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { company } = await api.getCompany(companyId);
      return company;
    },
    enabled: Boolean(companyId),
  });
}

export type { Company };
