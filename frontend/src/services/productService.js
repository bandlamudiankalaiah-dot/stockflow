import api from "./api";

export async function listProducts({ q = "", lowStock = false } = {}) {
  const params = {};
  if (q) params.q = q;
  if (lowStock) params.low_stock = true;
  const { data } = await api.get("/products", { params });
  return data;
}

export async function getProduct(productId) {
  const { data } = await api.get(`/products/${productId}`);
  return data;
}

export async function createProduct(payload) {
  const { data } = await api.post("/products", payload);
  return data;
}

export async function updateProduct(productId, payload) {
  const { data } = await api.put(`/products/${productId}`, payload);
  return data;
}

export async function deleteProduct(productId) {
  await api.delete(`/products/${productId}`);
}

export async function adjustStock(productId, operation, quantity) {
  const { data } = await api.post(`/products/${productId}/stock`, { operation, quantity });
  return data;
}
