import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import StockStatusBadge from "../components/StockStatusBadge";
import SummaryCard from "../components/SummaryCard";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";
import { getDashboardSummary, getLowStockProducts } from "../services/dashboardService";
import { formatCurrency, formatNumber } from "../utils/format";

export default function Dashboard() {
  const { organization } = useAuth();
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, lowStockData] = await Promise.all([
        getDashboardSummary(),
        getLowStockProducts(),
      ]);
      setSummary(summaryData);
      setLowStock(lowStockData.items);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load the dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <>
      <div className="sf-page-head">
        <div>
          <h2 className="sf-section-title">Inventory overview</h2>
          <p className="text-secondary small mb-0">
            Live totals across {organization?.name || "your organization"}. Every number is read
            from your database.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/products" className="btn btn-light btn-sm">
            <i className="bi bi-table me-2" aria-hidden="true" />
            View products
          </Link>
          <Link to="/products/new" className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            Add product
          </Link>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span className="small">{error}</span>
          </div>
          <button type="button" className="btn btn-sm btn-light" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <SummaryCard
            label="Total Products"
            value={summary ? formatNumber(summary.total_products) : "—"}
            hint="Distinct SKUs in your catalog"
            icon="bi-box-seam"
            tone="blue"
          />
        </div>
        <div className="col-xl-3 col-md-6">
          <SummaryCard
            label="Total Stock Quantity"
            value={summary ? formatNumber(summary.total_stock_quantity) : "—"}
            hint="Units on hand across all products"
            icon="bi-stack"
            tone="indigo"
          />
        </div>
        <div className="col-xl-3 col-md-6">
          <SummaryCard
            label="Low Stock Products"
            value={summary ? formatNumber(summary.low_stock_products) : "—"}
            hint="At or below their threshold"
            icon="bi-exclamation-triangle"
            tone="amber"
          />
        </div>
        <div className="col-xl-3 col-md-6">
          <SummaryCard
            label="Inventory Value"
            value={summary ? formatCurrency(summary.inventory_value) : "—"}
            hint="Quantity × cost price"
            icon="bi-cash-coin"
            tone="green"
          />
        </div>
      </div>

      <section className="sf-panel">
        <div className="sf-panel-header">
          <div>
            <h3 className="sf-panel-title mb-0">
              Low stock alerts
              {summary && summary.low_stock_products > 0 ? (
                <span className="sf-count-pill ms-2">{summary.low_stock_products}</span>
              ) : null}
            </h3>
            <p className="sf-panel-subtitle mb-0">
              Products at or below their threshold
              {summary ? ` (organization default: ${summary.default_low_stock_threshold})` : ""}.
            </p>
          </div>
          <Link to="/products" className="btn btn-light btn-sm">
            Manage inventory
          </Link>
        </div>

        {loading ? (
          <Loader label="Loading inventory insights…" />
        ) : lowStock.length === 0 ? (
          <EmptyState
            icon="bi-shield-check"
            title="Everything is well stocked"
            message="No product is at or below its low-stock threshold right now."
            action={
              <Link to="/products" className="btn btn-light btn-sm">
                Review all products
              </Link>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table sf-table align-middle">
              <thead>
                <tr>
                  <th scope="col">Product Name</th>
                  <th scope="col">SKU</th>
                  <th scope="col" className="text-end">Current Quantity</th>
                  <th scope="col" className="text-end">Minimum Stock Threshold</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link
                        to={`/products/${product.id}/edit`}
                        className="fw-semibold text-decoration-none"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td>
                      <span className="sf-sku">{product.sku}</span>
                    </td>
                    <td className="text-end fw-semibold">{formatNumber(product.quantity_on_hand)}</td>
                    <td className="text-end">{product.effective_threshold}</td>
                    <td>
                      <StockStatusBadge
                        status={product.status}
                        isLowStock={product.is_low_stock}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
