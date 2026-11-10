import api from "./api";

export async function getSettings() {
  const { data } = await api.get("/settings");
  return data;
}

export async function updateSettings(payload) {
  const { data } = await api.put("/settings", payload);
  return data;
}
