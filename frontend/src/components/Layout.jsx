import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { initialsFromName } from "../utils/format";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "bi-grid-1x2" },
  { to: "/products", label: "Products", icon: "bi-box-seam" },
  { to: "/settings", label: "Settings", icon: "bi-sliders" },
];

function pageTitle(pathname) {
  if (pathname.startsWith("/products/new")) return "Add Product";
  if (/^\/products\/[^/]+\/edit$/.test(pathname)) return "Edit Product";
  if (pathname.startsWith("/products")) return "Products";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

export default function Layout() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="sf-shell">
      {sidebarOpen ? (
        <div className="sf-backdrop d-lg-none" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <aside className={`sf-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sf-brand">
          <span className="sf-brand-icon">
            <i className="bi bi-box-seam-fill" aria-hidden="true" />
          </span>
          <span>
            StockFlow
            <span className="sf-brand-caption">Inventory Suite</span>
          </span>
        </div>

        <nav className="sf-nav" aria-label="Main navigation">
          <span className="sf-nav-label">Workspace</span>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sf-nav-link ${isActive ? "active" : ""}`}
              end={item.to === "/products"}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <span className="sf-nav-label mt-3">Quick actions</span>
          <NavLink to="/products/new" className="sf-nav-link">
            <i className="bi bi-plus-square" aria-hidden="true" />
            <span>New product</span>
          </NavLink>
        </nav>

        <div className="sf-sidebar-footer">
          <div className="sf-org-tile">
            <div className="sf-org-avatar">
              {initialsFromName(organization?.name || "StockFlow")}
            </div>
            <div className="min-w-0">
              <p className="sf-org-name mb-0 text-truncate">{organization?.name || "Your organization"}</p>
              <p className="sf-org-plan mb-0">Inventory workspace</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="sf-main">
        <header className="sf-topbar">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-light btn-icon d-lg-none"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list" aria-hidden="true" />
            </button>
            <div>
              <h1 className="sf-page-title mb-0">{pageTitle(location.pathname)}</h1>
              <p className="sf-page-subtitle mb-0 d-none d-sm-block">
                {organization?.name || "StockFlow workspace"}
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <NavLink to="/products/new" className="btn btn-primary btn-sm d-none d-md-inline-flex">
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Add Product
            </NavLink>

            <div className="sf-user-menu" ref={menuRef}>
              <button
                type="button"
                className="sf-user-chip"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <span className="sf-user-avatar">{initialsFromName(user?.full_name)}</span>
                <span className="d-none d-md-flex flex-column text-start">
                  <span className="sf-user-name">{user?.full_name}</span>
                  <span className="sf-user-email">{user?.email}</span>
                </span>
                <i className="bi bi-chevron-down sf-user-caret" aria-hidden="true" />
              </button>

              {menuOpen ? (
                <div className="sf-user-dropdown" role="menu">
                  <div className="px-3 py-2 border-bottom">
                    <p className="mb-0 fw-semibold small">{user?.full_name}</p>
                    <p className="mb-0 text-secondary sf-user-email">{user?.email}</p>
                  </div>
                  <NavLink to="/settings" className="sf-dropdown-item" role="menuitem">
                    <i className="bi bi-sliders" aria-hidden="true" />
                    Organization settings
                  </NavLink>
                  <button
                    type="button"
                    className="sf-dropdown-item text-danger"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <i className="bi bi-box-arrow-right" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="sf-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
