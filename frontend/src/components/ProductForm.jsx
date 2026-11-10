import { useState } from "react";
import { Link } from "react-router-dom";

const EMPTY_VALUES = {
  name: "",
  sku: "",
  description: "",
  quantity_on_hand: "0",
  cost_price: "",
  selling_price: "",
  low_stock_threshold: "",
};

function FieldError({ message }) {
  if (!message) return null;
  return <div className="invalid-feedback d-block">{message}</div>;
}

export default function ProductForm({
  initialValues,
  defaultThreshold = 5,
  onSubmit,
  submitting = false,
  submitLabel = "Save product",
  serverError = "",
  cancelTo = "/products",
}) {
  const [values, setValues] = useState({ ...EMPTY_VALUES, ...(initialValues || {}) });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = "Product name is required";
    else if (values.name.trim().length > 200) next.name = "Name must be 200 characters or fewer";

    if (!values.sku.trim()) next.sku = "SKU is required";
    else if (values.sku.trim().length > 80) next.sku = "SKU must be 80 characters or fewer";

    if (values.description.length > 2000) {
      next.description = "Description must be 2000 characters or fewer";
    }

    const quantity = Number(values.quantity_on_hand);
    if (values.quantity_on_hand === "" || !Number.isInteger(quantity) || quantity < 0) {
      next.quantity_on_hand = "Quantity must be a whole number of 0 or more";
    }

    for (const [field, label] of [
      ["cost_price", "Cost price"],
      ["selling_price", "Selling price"],
    ]) {
      if (values[field] !== "") {
        const numeric = Number(values[field]);
        if (Number.isNaN(numeric) || numeric < 0) {
          next[field] = `${label} must be a number of 0 or more`;
        }
      }
    }

    if (values.low_stock_threshold !== "") {
      const threshold = Number(values.low_stock_threshold);
      if (!Number.isInteger(threshold) || threshold < 0) {
        next.low_stock_threshold = "Threshold must be a whole number of 0 or more";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: values.name.trim(),
      sku: values.sku.trim(),
      description: values.description.trim() ? values.description.trim() : null,
      quantity_on_hand: Number(values.quantity_on_hand),
      cost_price: values.cost_price === "" ? null : Number(values.cost_price),
      selling_price: values.selling_price === "" ? null : Number(values.selling_price),
      low_stock_threshold:
        values.low_stock_threshold === "" ? null : Number(values.low_stock_threshold),
    });
  };

  const effectiveThreshold =
    values.low_stock_threshold === "" ? defaultThreshold : Number(values.low_stock_threshold);
  const quantity = Number(values.quantity_on_hand);
  const thresholdPreview = Number.isNaN(effectiveThreshold) ? defaultThreshold : effectiveThreshold;
  const isLowStock =
    !Number.isNaN(quantity) && quantity <= thresholdPreview ? true : false;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError ? (
        <div className="alert alert-danger d-flex align-items-start gap-2 py-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true" />
          <span className="small">{serverError}</span>
        </div>
      ) : null}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="sf-panel mb-4">
            <div className="sf-panel-header">
              <div>
                <h3 className="sf-panel-title mb-0">Product details</h3>
                <p className="sf-panel-subtitle mb-0">Identify and describe the item you stock.</p>
              </div>
            </div>
            <div className="sf-panel-body">
              <div className="row g-3">
                <div className="col-md-7">
                  <label className="form-label" htmlFor="name">
                    Product name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    value={values.name}
                    onChange={handleChange}
                    placeholder="e.g. Wireless Mouse"
                    maxLength={200}
                    autoComplete="off"
                  />
                  <FieldError message={errors.name} />
                </div>

                <div className="col-md-5">
                  <label className="form-label" htmlFor="sku">
                    SKU <span className="text-danger">*</span>
                  </label>
                  <input
                    id="sku"
                    name="sku"
                    type="text"
                    className={`form-control text-uppercase ${errors.sku ? "is-invalid" : ""}`}
                    value={values.sku}
                    onChange={handleChange}
                    placeholder="e.g. WM-100"
                    maxLength={80}
                    autoComplete="off"
                  />
                  <FieldError message={errors.sku} />
                  <div className="form-text">Unique within your organization.</div>
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className={`form-control ${errors.description ? "is-invalid" : ""}`}
                    value={values.description}
                    onChange={handleChange}
                    placeholder="Optional notes about this product"
                    maxLength={2000}
                  />
                  <FieldError message={errors.description} />
                </div>
              </div>
            </div>
          </div>

          <div className="sf-panel">
            <div className="sf-panel-header">
              <div>
                <h3 className="sf-panel-title mb-0">Pricing</h3>
                <p className="sf-panel-subtitle mb-0">Used for inventory value and margin reporting.</p>
              </div>
            </div>
            <div className="sf-panel-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="cost_price">
                    Cost price (USD)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      id="cost_price"
                      name="cost_price"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`form-control ${errors.cost_price ? "is-invalid" : ""}`}
                      value={values.cost_price}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>
                  <FieldError message={errors.cost_price} />
                  <div className="form-text">Inventory value is calculated from this price.</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="selling_price">
                    Selling price (USD)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      id="selling_price"
                      name="selling_price"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`form-control ${errors.selling_price ? "is-invalid" : ""}`}
                      value={values.selling_price}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>
                  <FieldError message={errors.selling_price} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="sf-panel mb-4">
            <div className="sf-panel-header">
              <div>
                <h3 className="sf-panel-title mb-0">Inventory</h3>
                <p className="sf-panel-subtitle mb-0">Stock levels and alert threshold.</p>
              </div>
            </div>
            <div className="sf-panel-body">
              <div className="mb-3">
                <label className="form-label" htmlFor="quantity_on_hand">
                  Quantity on hand <span className="text-danger">*</span>
                </label>
                <input
                  id="quantity_on_hand"
                  name="quantity_on_hand"
                  type="number"
                  min="0"
                  step="1"
                  className={`form-control ${errors.quantity_on_hand ? "is-invalid" : ""}`}
                  value={values.quantity_on_hand}
                  onChange={handleChange}
                />
                <FieldError message={errors.quantity_on_hand} />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="low_stock_threshold">
                  Low stock threshold
                </label>
                <input
                  id="low_stock_threshold"
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  step="1"
                  className={`form-control ${errors.low_stock_threshold ? "is-invalid" : ""}`}
                  value={values.low_stock_threshold}
                  onChange={handleChange}
                  placeholder={`Organization default (${defaultThreshold})`}
                />
                <FieldError message={errors.low_stock_threshold} />
                <div className="form-text">
                  Leave empty to use your organization default of {defaultThreshold}.
                </div>
              </div>

              <div className="sf-stock-summary">
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-secondary">Effective threshold</span>
                  <strong>{thresholdPreview}</strong>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-secondary">Status preview</span>
                  <span
                    className={`sf-badge ${
                      isLowStock ? "sf-badge-warning" : "sf-badge-success"
                    }`}
                  >
                    {isLowStock ? "Low Stock" : "In Stock"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="sf-panel">
            <div className="sf-panel-body">
              <button type="submit" className="btn btn-primary w-100 mb-2" disabled={submitting}>
                {submitting ? (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                ) : (
                  <i className="bi bi-check2 me-2" aria-hidden="true" />
                )}
                {submitLabel}
              </button>
              <Link to={cancelTo} className="btn btn-light w-100">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
