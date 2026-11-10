import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../services/api";
import { getSettings, updateSettings } from "../services/settingsService";
import { formatDate } from "../utils/format";

export default function Settings() {
  const { refreshSession } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({ organization_name: "", default_low_stock_threshold: "" });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const settings = await getSettings();
        if (!active) return;
        setForm({
          organization_name: settings.organization_name,
          default_low_stock_threshold: String(settings.default_low_stock_threshold),
        });
        setLastUpdated(settings.updated_at);
      } catch (err) {
        if (active) setLoadError(getApiErrorMessage(err, "Unable to load settings."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.organization_name.trim().length < 2) {
      next.organization_name = "Organization name must be at least 2 characters";
    }
    const threshold = Number(form.default_low_stock_threshold);
    if (
      form.default_low_stock_threshold === "" ||
      !Number.isInteger(threshold) ||
      threshold < 0 ||
      threshold > 100000
    ) {
      next.default_low_stock_threshold = "Threshold must be a whole number between 0 and 100000";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSaving(true);
    try {
      const updated = await updateSettings({
        organization_name: form.organization_name.trim(),
        default_low_stock_threshold: Number(form.default_low_stock_threshold),
      });
      setLastUpdated(updated.updated_at);
      notify("Organization settings saved.", "success");
      await refreshSession().catch(() => {});
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Unable to save settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sf-page-head">
        <div>
          <h2 className="sf-section-title">Organization settings</h2>
          <p className="text-secondary small mb-0">
            Manage your organization profile and inventory alert defaults.
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="alert alert-danger small">{loadError}</div>
      ) : loading ? (
        <div className="sf-panel">
          <Loader label="Loading settings…" />
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="sf-panel">
              <div className="sf-panel-header">
                <div>
                  <h3 className="sf-panel-title mb-0">Workspace preferences</h3>
                  <p className="sf-panel-subtitle mb-0">
                    Applies to everyone in your organization.
                  </p>
                </div>
              </div>
              <div className="sf-panel-body">
                {serverError ? (
                  <div className="alert alert-danger d-flex align-items-start gap-2 py-2">
                    <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true" />
                    <span className="small">{serverError}</span>
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="organization_name">
                      Organization name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="organization_name"
                      type="text"
                      className={`form-control ${errors.organization_name ? "is-invalid" : ""}`}
                      value={form.organization_name}
                      onChange={handleChange("organization_name")}
                      maxLength={160}
                      disabled={saving}
                    />
                    {errors.organization_name ? (
                      <div className="invalid-feedback d-block">{errors.organization_name}</div>
                    ) : (
                      <div className="form-text">Shown in the sidebar and page header.</div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="form-label" htmlFor="default_low_stock_threshold">
                      Default low stock threshold <span className="text-danger">*</span>
                    </label>
                    <input
                      id="default_low_stock_threshold"
                      type="number"
                      min="0"
                      step="1"
                      className={`form-control ${
                        errors.default_low_stock_threshold ? "is-invalid" : ""
                      }`}
                      value={form.default_low_stock_threshold}
                      onChange={handleChange("default_low_stock_threshold")}
                      disabled={saving}
                    />
                    {errors.default_low_stock_threshold ? (
                      <div className="invalid-feedback d-block">
                        {errors.default_low_stock_threshold}
                      </div>
                    ) : (
                      <div className="form-text">
                        Used for products that do not define their own threshold.
                      </div>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? (
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                      ) : (
                        <i className="bi bi-check2 me-2" aria-hidden="true" />
                      )}
                      Save settings
                    </button>
                    {lastUpdated ? (
                      <span className="small text-secondary">
                        Last updated {formatDate(lastUpdated)}
                      </span>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="sf-panel mb-4">
              <div className="sf-panel-header">
                <h3 className="sf-panel-title mb-0">How low-stock alerts work</h3>
              </div>
              <div className="sf-panel-body small text-secondary">
                <p>
                  A product is low stock when its quantity on hand is less than or equal to its own
                  threshold.
                </p>
                <p className="mb-3">
                  If a product has no threshold, StockFlow falls back to the organization default
                  you set here.
                </p>
                <div className="sf-stock-summary">
                  <code className="d-block">quantity_on_hand &le; threshold</code>
                </div>
              </div>
            </div>

            <div className="sf-panel">
              <div className="sf-panel-header">
                <h3 className="sf-panel-title mb-0">Organization data</h3>
              </div>
              <div className="sf-panel-body small text-secondary">
                <p className="mb-3">
                  Products, stock levels and these settings are scoped to your organization. Other
                  StockFlow organizations cannot read or modify them.
                </p>
                <Link to="/products" className="btn btn-light btn-sm">
                  Manage products
                  <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
