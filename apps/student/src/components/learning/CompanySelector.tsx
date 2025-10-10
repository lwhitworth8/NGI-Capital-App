"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { learningAPI, type Company } from "@/lib/api/learning";

interface CompanySelectorProps {
  onCompanySelected: (companyId: number) => void;
  selectedCompanyId?: number | null;
}

export default function CompanySelector({
  onCompanySelected,
  selectedCompanyId = null,
}: CompanySelectorProps) {
  const { getToken } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<number | null>(null);

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await learningAPI.getCompanies(token);
      setCompanies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (companyId: number) => {
    try {
      setSelectingId(companyId);
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await learningAPI.selectCompany(companyId, token);
      onCompanySelected(companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select company");
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div role="status" className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded" />)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select a Company</h3>
        {error && (
          <span className="text-sm text-red-600">Error: {error}</span>
        )}
      </div>

      {error && (
        <button
          onClick={loadCompanies}
          className="py-1.5 px-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
        >
          Try again
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((c) => {
          const isSelected = selectedCompanyId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              disabled={selectingId === c.id}
              className={[
                "text-left p-4 rounded-lg border transition-colors",
                "hover:border-gray-300 dark:hover:border-gray-600",
                isSelected ? "border-green-500" : "border-gray-200 dark:border-gray-700",
                selectingId === c.id ? "opacity-50 cursor-not-allowed" : "",
                "bg-white dark:bg-gray-900",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.ticker}</span>
                <span className="text-xs text-gray-400">{c.industry}</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {c.company_name}
              </div>
              {c.description && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {c.description}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
