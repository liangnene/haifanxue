// Adapter layer. Today reads from mock; future swap to real backend
// happens here without touching admin pages.

import {
  getDashboardSummary,
  getUsageSummary,
  getApiSummary,
  type DashboardSummary,
  type UsageSummary,
  type ApiSummary,
} from "./admin-mock";

export type { DashboardSummary, UsageSummary, ApiSummary };

export function fetchDashboard(): DashboardSummary {
  return getDashboardSummary();
}

export function fetchUsage(): UsageSummary {
  return getUsageSummary();
}

export function fetchApi(): ApiSummary {
  return getApiSummary();
}
