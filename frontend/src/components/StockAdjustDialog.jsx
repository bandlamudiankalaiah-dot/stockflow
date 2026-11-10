import { useState } from "react";

import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../services/api";
import { adjustStock } from "../services/productService";

const OPERATIONS = [
  { value: "increase", label: "Increase stock", icon: "bi-plus-circle" },
  { value: "decrease", label: "Decrease stock", icon: "bi-dash-circle" },
  { value: "set", label: "Set exact quantity", icon: "bi-sliders" },
];

export default function StockAdjustDialog({ product, onClose, onAdjusted }) {
  const { notify } = useToast();
  const [operation, setOperation] = useState("increase");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!product) return null;

  const numericQuantity = Number(quantity);
  let preview = product.quantity_on_hand;
  if (quantity !== "" && Number.isInteger(numericQuantity) && numericQuantity >= 0) {
    if (operation === "increase") preview = product.quantity_on_hand + numericQuantity;
    else if (operation === "decrease") preview = product.quantity_on_hand - numericQuantity;
    else preview = numericQuantity;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (quantity === "" || !Number.isInteger(numericQuantity) || numericQuantity < 0) {
      setError("Enter a whole number of 0 or more.");
      return;
    }
    if (operation !== "set" && numericQuantity === 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const updated = await adjustStock(product.id, operation, numericQuantity);
      notify(`Stock for ${updated.name} is now ${updated.quantity_on_hand}.`, "success");
      onAdjusted(updated);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update stock."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sf-modal-backdrop" onClick={saving ? undefined : onClose} aria-hidden="true" />
      <div className="modal d-block sf-modal" role="dialog" aria-modal="true" aria-label="Adjust stock">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content sf-modal-content">
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-header border-0 pb-0">
                <div>
                  <h5 className="modal-title fw-semibold mb-1">Adjust stock</h5>
                  <p className="text-secondary small mb-0">
                    {product.name} · <span className="sf-sku">{product.sku}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                  disabled={saving}
                />
              </div>

              <div className="modal-body">
                <div className="sf-stock-summary mb-3">
                  <div className="d-flex justify-content-between small">
                    <span className="text-secondary">Current quantity</span>
                    <strong>{product.quantity_on_hand}</strong>
                  </div>
                </div>

                {error ? (
                  <div className="alert alert-danger d-flex gap-2 py-2 small" role="alert">
                    <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="mb-3">
                  <label className="form-label" htmlFor="stock-operation">
                    Operation
                  </label>
                  <select
                    id="stock-operation"
                    className="form-select"
                    value={operation}
                    onChange={(event) => setOperation(event.target.value)}
                    disabled={saving}
                  >
                    {OPERATIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="stock-quantity">
                    {operation === "set" ? "New quantity" : "Units"}
                  </label>
                  <input
                    id="stock-quantity"
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="0"
                    disabled={saving}
                    autoFocus
                  />
                </div>

                <div className="sf-stock-summary">
                  <div className="d-flex justify-content-between small">
                    <span className="text-secondary">Quantity after saving</span>
                    <strong className={preview < 0 ? "text-danger" : ""}>
                      {Number.isNaN(preview) ? "—" : preview}
                    </strong>
                  </div>
                  {preview < 0 ? (
                    <p className="text-danger small mb-0 mt-2">
                      Stock cannot become negative.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  ) : null}
                  Update stock
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
