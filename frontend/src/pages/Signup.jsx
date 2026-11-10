import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";

const INITIAL_FORM = {
  full_name: "",
  organization_name: "",
  email: "",
  password: "",
  confirm_password: "",
};

export default function Signup() {
  const { user, initializing, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!initializing && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};

    if (form.full_name.trim().length < 2) next.full_name = "Enter your full name";
    if (form.organization_name.trim().length < 2) {
      next.organization_name = "Enter your organization name";
    }
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (form.password.length < 6) next.password = "Password must be at least 6 characters";
    if (form.confirm_password !== form.password) {
      next.confirm_password = "Passwords do not match";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        organization_name: form.organization_name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Unable to create your account."));
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
          <span className="sf-auth-eyebrow">Start in minutes</span>
          <h2 className="sf-auth-headline">A private inventory workspace for your team.</h2>
          <p className="sf-auth-lede">
            Signing up creates your organization, seeds your settings and gives you a JWT-scoped
            workspace that nobody else can read.
          </p>
          <ul className="sf-auth-features">
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              One organization per account, fully isolated data
            </li>
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              Product CRUD with duplicate SKU protection
            </li>
            <li>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              Stock adjustments that can never go negative
            </li>
          </ul>
        </div>

        <p className="sf-auth-footnote mb-0">No credit card, no setup fees.</p>
      </aside>

      <main className="sf-auth-panel">
        <div className="sf-auth-card">
          <h1 className="h4 fw-bold mb-1">Create your workspace</h1>
          <p className="text-secondary small mb-4">
            Set up an organization and start tracking inventory.
          </p>

          {apiError ? (
            <div className="alert alert-danger d-flex align-items-start gap-2 py-2" role="alert">
              <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true" />
              <span className="small">{apiError}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label" htmlFor="full_name">
                  Full name
                </label>
                <input
                  id="full_name"
                  type="text"
                  className={`form-control ${errors.full_name ? "is-invalid" : ""}`}
                  value={form.full_name}
                  onChange={update("full_name")}
                  autoComplete="name"
                  disabled={submitting}
                />
                {errors.full_name ? (
                  <div className="invalid-feedback d-block">{errors.full_name}</div>
                ) : null}
              </div>

              <div className="col-sm-6">
                <label className="form-label" htmlFor="organization_name">
                  Organization name
                </label>
                <input
                  id="organization_name"
                  type="text"
                  className={`form-control ${errors.organization_name ? "is-invalid" : ""}`}
                  value={form.organization_name}
                  onChange={update("organization_name")}
                  placeholder="e.g. Northwind Traders"
                  disabled={submitting}
                />
                {errors.organization_name ? (
                  <div className="invalid-feedback d-block">{errors.organization_name}</div>
                ) : null}
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@company.com"
                  autoComplete="email"
                  disabled={submitting}
                />
                {errors.email ? (
                  <div className="invalid-feedback d-block">{errors.email}</div>
                ) : null}
              </div>

              <div className="col-sm-6">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  value={form.password}
                  onChange={update("password")}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {errors.password ? (
                  <div className="invalid-feedback d-block">{errors.password}</div>
                ) : (
                  <div className="form-text">At least 6 characters.</div>
                )}
              </div>

              <div className="col-sm-6">
                <label className="form-label" htmlFor="confirm_password">
                  Confirm password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  className={`form-control ${errors.confirm_password ? "is-invalid" : ""}`}
                  value={form.confirm_password}
                  onChange={update("confirm_password")}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {errors.confirm_password ? (
                  <div className="invalid-feedback d-block">{errors.confirm_password}</div>
                ) : null}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 mt-4" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Creating workspace…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center small text-secondary mt-3 mb-0">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
