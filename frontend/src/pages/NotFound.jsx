import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="sf-auth-panel min-vh-100">
      <div className="sf-auth-card text-center">
        <div className="sf-empty-icon mx-auto mb-3">
          <i className="bi bi-compass" aria-hidden="true" />
        </div>
        <h1 className="h4 fw-bold mb-1">Page not found</h1>
        <p className="text-secondary small mb-4">
          The page you were looking for does not exist or was moved.
        </p>
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="btn btn-primary w-100">
          {isAuthenticated ? "Back to dashboard" : "Go to sign in"}
        </Link>
      </div>
    </div>
  );
}
