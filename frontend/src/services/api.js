import axios from "axios";

export const TOKEN_STORAGE_KEY = "stockflow_token";

// Locally the SPA talks to `/api`, which the Vite dev server proxies to FastAPI.
// In production VITE_API_URL points at the deployed backend.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/register");
    if (status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event("stockflow:unauthorized"));
    }
    return Promise.reject(error);
  }
);

function formatValidationDetail(detail) {
  return detail
    .map((item) => {
      const rawField = Array.isArray(item.loc)
        ? item.loc.filter((part) => part !== "body" && part !== "query").join(".")
        : "";
      const fieldLabel = rawField
        ? rawField.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase())
        : "Field";
      const message = String(item.msg || "Invalid value").replace(/^Value error, /, "");
      return `${fieldLabel}: ${message}`;
    })
    .join(" · ");
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code === "ERR_NETWORK") {
    return "Cannot reach the StockFlow API. Make sure the backend is running.";
  }
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) return formatValidationDetail(detail);
  if (typeof error.response?.data?.message === "string") return error.response.data.message;
  return fallback;
}

export default api;
