import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";

export default function Login() {
  const { user, initializing, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!initializing && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (!form.password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Unable to sign in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sf-auth">
      <aside className="sf-auth-hero">
        <div className="sf-brand sf-brand-light">
          <span className="sf-brand-icon">
            <i className="bi bi-box-seam-fill" aria-hidden="true" />
          </span>
          <span>
            StockFlow
            <span className="sf-brand-caption">Inventory Suite</span>
          </span>
        </div>

        <div className="sf-auth-hero-body">
          <span className="sf-auth-eyebrow">SaaS inventory management</span>
          <h2 className="sf-auth-headline">Every SKU, every unit, one calm dashboard.</h2>
          <p className="sf-auth-lede">
            Track stock in real time, catch low inventory before it costs you a sale, and keep
            each organization&apos;s data completely isolated.
          </p>
          <ul className="sf-auth-features">
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              Live dashboard totals from your own database
            </li>
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              Low-stock alerts with per-product thresholds
            </li>
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              JWT-protected, organization-scoped inventory
            </li>
          </ul>
        </div>

        <p className="sf-auth-footnote mb-0">React · FastAPI · PostgreSQL</p>
      </aside>

      <main className="sf-auth-panel">
        <div className="sf-auth-card">
          <h1 className="h4 fw-bold mb-1">Welcome back</h1>
          <p className="text-secondary small mb-4">Sign in to your StockFlow workspace.</p>

          {apiError ? (
            <div className="alert alert-danger d-flex align-items-start gap-2 py-2" role="alert">
              <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true" />
              <span className="small">{apiError}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">
                Email address
              </label>
              <div className="sf-input-icon">
                <i className="bi bi-envelope" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="you@company.com"
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>
              {errors.email ? <div className="invalid-feedback d-block">{errors.email}</div> : null}
            </div>

            <div className="mb-4">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="sf-input-icon">
                <i className="bi bi-lock" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Your password"
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </div>
              {errors.password ? (
                <div className="invalid-feedback d-block">{errors.password}</div>
              ) : null}
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center small text-secondary mt-3 mb-0">
            New to StockFlow? <Link to="/signup">Create an organization</Link>
          </p>

          <div className="sf-demo-hint">
            Seeded demo account: <strong>demo@stockflow.app</strong> / <strong>Demo123!</strong>
          </div>
        </div>
      </main>
    </div>
  );
}
