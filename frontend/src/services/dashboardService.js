import api from "./api";

export async function getDashboardSummary() {
  const { data } = await api.get("/dashboard/summary");
  return data;
}

export async function getLowStockProducts() {
  const { data } = await api.get("/dashboard/low-stock");
  return data;
}
