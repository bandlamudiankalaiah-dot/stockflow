import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import StockAdjustDialog from "../components/StockAdjustDialog";
import StockStatusBadge from "../components/StockStatusBadge";
import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../services/api";
import { deleteProduct, listProducts } from "../services/productService";
import { formatCurrency, formatNumber } from "../utils/format";

export default function Products() {
  const { notify } = useToast();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [defaultThreshold, setDefaultThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [stockTarget, setStockTarget] = useState(null);
  const requestRef = useRef(0);

  const loadProducts = useCallback(async (term, { silent = false } = {}) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (!silent) setLoading(true);
    try {
      const data = await listProducts({ q: term });
      if (requestId !== requestRef.current) return;
      setProducts(data.items);
      setDefaultThreshold(data.default_low_stock_threshold);
      setError("");
    } catch (err) {
      if (requestId === requestRef.current) {
        setError(getApiErrorMessage(err, "Unable to load products."));
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadProducts(searchTerm), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, loadProducts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      notify(`${deleteTarget.name} was deleted.`, "success");
      setDeleteTarget(null);
      await loadProducts(searchTerm, { silent: true });
    } catch (err) {
      notify(getApiErrorMessage(err, "Unable to delete the product."), "danger");
    } finally {
      setDeleting(false);
    }
  };

  const handleStockAdjusted = async () => {
    setStockTarget(null);
    await loadProducts(searchTerm, { silent: true });
  };

  const hasSearch = searchTerm.trim().length > 0;

  return (
    <>
      <div className="sf-page-head">
        <div>
          <h2 className="sf-section-title">Products</h2>
          <p className="text-secondary small mb-0">
            {formatNumber(products.length)} {products.length === 1 ? "product" : "products"}
            {hasSearch ? ` matching “${searchTerm.trim()}”` : " in your catalog"} · default
            threshold {defaultThreshold}
          </p>
        </div>
        <Link to="/products/new" className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Add Product
        </Link>
      </div>

      <div className="sf-panel">
        <div className="sf-panel-header">
          <div className="sf-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              className="form-control"
              placeholder="Search by product name or SKU…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search products by name or SKU"
            />
          </div>
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={() => loadProducts(searchTerm)}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="p-3">
            <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-0">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                <span className="small">{error}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light"
                onClick={() => loadProducts(searchTerm)}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <Loader label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={hasSearch ? "bi-search" : "bi-box-seam"}
            title={hasSearch ? "No products match your search" : "Your catalog is empty"}
            message={
              hasSearch
                ? "Try a different product name or SKU, or clear the search to see everything."
                : "Add your first product to start tracking stock levels and inventory value."
            }
            action={
              hasSearch ? (
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setSearchTerm("")}
                >
                  Clear search
                </button>
              ) : (
                <Link to="/products/new" className="btn btn-primary btn-sm">
                  <i className="bi bi-plus-lg me-2" aria-hidden="true" />
                  Add your first product
                </Link>
              )
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table sf-table align-middle">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">SKU</th>
                  <th scope="col" className="text-end">Quantity</th>
                  <th scope="col" className="text-end">Threshold</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">Selling Price</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="fw-semibold text-dark">{product.name}</div>
                      {product.description ? (
                        <div className="sf-table-subtext text-truncate">{product.description}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="sf-sku">{product.sku}</span>
                    </td>
                    <td className="text-end fw-semibold">{formatNumber(product.quantity_on_hand)}</td>
                    <td className="text-end">
                      {product.effective_threshold}
                      {product.low_stock_threshold === null ? (
                        <span className="sf-default-tag ms-1" title="Using organization default">
                          default
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <StockStatusBadge status={product.status} isLowStock={product.is_low_stock} />
                    </td>
                    <td className="text-end">{formatCurrency(product.selling_price)}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-light btn-icon-sm"
                          title="Adjust stock"
                          aria-label={`Adjust stock for ${product.name}`}
                          onClick={() => setStockTarget(product)}
                        >
                          <i className="bi bi-arrow-left-right" aria-hidden="true" />
                        </button>
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="btn btn-light btn-icon-sm"
                          title="Edit product"
                          aria-label={`Edit ${product.name}`}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-light btn-icon-sm text-danger"
                          title="Delete product"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => setDeleteTarget(product)}
                        >
                          <i className="bi bi-trash3" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && products.length > 0 ? (
          <div className="sf-panel-footer">
            <span className="small text-secondary">
              Showing {products.length} {products.length === 1 ? "product" : "products"}
            </span>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        show={Boolean(deleteTarget)}
        title="Delete product?"
        message={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.name}</strong> (<span className="sf-sku">{deleteTarget.sku}</span>)
              will be permanently removed from your organization&apos;s inventory. This cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete product"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        variant="danger"
        icon="bi-trash3"
      />

      <StockAdjustDialog
        key={stockTarget?.id || "none"}
        product={stockTarget}
        onClose={() => setStockTarget(null)}
        onAdjusted={handleStockAdjusted}
      />
    </>
  );
}
