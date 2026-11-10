const STYLES = {
  "In Stock": "sf-badge-success",
  "Low Stock": "sf-badge-warning",
  "Out of Stock": "sf-badge-danger",
};

export default function StockStatusBadge({ status, isLowStock }) {
  const label = status || (isLowStock ? "Low Stock" : "In Stock");
  return <span className={`sf-badge ${STYLES[label] || "sf-badge-success"}`}>{label}</span>;
}
