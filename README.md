# StockFlow — SaaS Inventory Management System

StockFlow is a complete, working multi-tenant inventory management application: React SPA, FastAPI REST backend, JWT authentication and a real relational database. Organizations are fully isolated from each other; every dashboard number is computed from database rows.

Built for the Phase 1 (6-hour MVP) PRD plus the full technical assignment brief: auth, product CRUD, stock adjustments, low-stock detection, organization settings, responsive SaaS UI, automated tests, Postman collection and deployment instructions.

---

## 1. Feature summary

| Area | Implemented |
| --- | --- |
| Authentication | Signup (full name, email, password, confirm, organization), login, logout, JWT access token, bcrypt hashing, duplicate-email handling, protected routes, session restore |
| Multi-tenancy | Every user belongs to one organization; all product/dashboard/settings queries are scoped by the JWT's organization. Cross-tenant reads/updates/deletes return `404` |
| Dashboard | Total Products, Total Stock Quantity, Low Stock Products, Inventory Value (quantity × cost price) — all live SQL aggregates. Low-stock table lists product, SKU, current quantity, effective threshold and status |
| Products | Create, read, update, delete, search by name/SKU, per-organization duplicate SKU protection, case-normalised SKUs, form validation, delete confirmation |
| Inventory | Increase, decrease or set stock quantity; negative quantities rejected with `400`; status automatically derived (`Out of Stock` at 0, `Low Stock` at/below threshold, otherwise `In Stock`) |
| Settings | Organization name and global default low-stock threshold, validated and persisted |
| UI/UX | Responsive sidebar + topbar shell, summary cards, data tables, search, modals, loading indicators, empty states, toast notifications, blue/white/light-gray professional theme |
| Quality | 16 automated API tests (pytest), Postman collection with assertions, complete README and `.env.example` files |

**Low-stock rule:** `quantity_on_hand <= effective_threshold`, where `effective_threshold` is the product's own `low_stock_threshold` if set, otherwise the organization's `default_low_stock_threshold` (default `5`).

---

## 2. Technology stack

**Frontend:** React 18, Vite 6, JavaScript, HTML5, CSS3, Bootstrap 5, Bootstrap Icons, Axios, React Router DOM.

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2 ORM, Pydantic v2, PyJWT (HS256), bcrypt.

**Database:** PostgreSQL in production; SQLite is used automatically when `DATABASE_URL` is not set, so local development needs no database server.

**Tooling:** VS Code, Postman, Git/GitHub. **Deployment:** Vercel (frontend), Render (backend + PostgreSQL).

---

## 3. Project structure

```
stockflow/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js               # dev proxy /api -> FastAPI
│   ├── .env.example
│   └── src/
│       ├── components/              # Layout, forms, dialogs, cards, guards
│       ├── context/                 # AuthContext, ToastContext
│       ├── pages/                   # Login, Signup, Dashboard, Products, Add/Edit, Settings
│       ├── services/                # axios client + API services
│       ├── utils/                   # currency/number/date formatting
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css                # design system
├── backend/
│   ├── main.py                      # FastAPI app, CORS, routers
│   ├── database.py                  # engine, session, SQLite/Postgres fallback
│   ├── models.py                    # users, organizations, products, settings
│   ├── schemas.py                   # Pydantic validation schemas
│   ├── auth.py                      # bcrypt + JWT + /auth routes
│   ├── products.py                  # product CRUD + stock endpoints
│   ├── dashboard.py                 # summary + low-stock endpoints
│   ├── settings.py                  # organization settings endpoints
│   ├── seed.py                      # optional demo data
│   ├── test_api.py                  # pytest suite (16 tests)
│   ├── requirements.txt
│   └── .env.example
├── postman/
│   └── StockFlow.postman_collection.json
├── README.md
└── .gitignore
```

---

## 4. Local development

### Prerequisites

- Python 3.10+ (3.12 recommended)
- Node.js 18+ and npm
- Optional: PostgreSQL 14+

### 4.1 Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Optional: copy environment defaults
cp .env.example .env               # then edit values

# SQLite fallback: just start it. Tables are created automatically.
uvicorn main:app --reload          # http://localhost:8000
```

API docs: <http://localhost:8000/docs> · health: <http://localhost:8000/health>

To use PostgreSQL locally:

```bash
createdb stockflow
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockflow"
uvicorn main:app --reload
```

The schema is created on startup with SQLAlchemy `create_all`; there is no separate migration step for this MVP. If you later change models, create a fresh database or add Alembic on top of `models.py` — the tables and constraints are all defined there.

### 4.2 Optional demo data

```bash
cd backend
python seed.py
```

Creates organization **Northwind Traders** with 8 products (some low stock / out of stock):

- Email: `demo@stockflow.app`
- Password: `Demo123!`

### 4.3 Frontend

```bash
cd frontend
npm install
npm run dev                        # http://localhost:3002
```

During development Axios calls `/api/...`, which the Vite dev server proxies to `http://127.0.0.1:8000` (see `vite.config.js`). Start the backend first.

To target a different backend port: `API_PROXY_TARGET=http://127.0.0.1:8001 npm run dev`.

### 4.4 Environment variables

Backend (`backend/.env`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL URL (`postgres://` normalised automatically). Omit for SQLite | `sqlite:///./stockflow.db` |
| `JWT_SECRET_KEY` | Token signing secret — **must be changed in production** | dev-only value |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime | `1440` |
| `DEFAULT_LOW_STOCK_THRESHOLD` | Threshold for new organizations | `5` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | localhost:5173/3002 |
| `CORS_ORIGIN_REGEX` | Regex for preview/deploy origins | `https://.*\.(style\.dev\|vercel\.app)` |

Frontend (`frontend/.env`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | Absolute backend URL in production. Empty = use `/api` proxy | empty |

Generate a real secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Secrets live only in environment files; nothing sensitive is shipped to the browser. The frontend never sees the JWT secret or database credentials.

---

## 5. Database design

```
organizations
  id (PK) | name | created_at
      │
      ├──< users
      │      id (PK) | full_name | email (unique) | password_hash | organization_id (FK) | created_at
      │
      ├──< products
      │      id (PK) | organization_id (FK) | name | sku | description
      │      quantity_on_hand | cost_price | selling_price | low_stock_threshold
      │      created_at | updated_at
      │      UNIQUE (organization_id, sku)
      │
      └──1 organization_settings
             organization_id (PK, FK) | default_low_stock_threshold | updated_at
```

- Every product carries `organization_id`; the API always filters on the authenticated user's organization, and detail/update/delete/stock endpoints look up `id AND organization_id`, so an ID from another tenant resolves to `404`.
- `UNIQUE (organization_id, sku)` is enforced in the database and pre-checked in the API (SKUs are stored uppercase, so `abc-1` and `ABC-1` collide).
- Deleting an organization cascades to its users, products and settings.

---

## 6. API reference

Base URL: `http://localhost:8000` (or your Render URL). All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Create organization + user, returns JWT (`201`) |
| POST | `/auth/login` | — | Email/password login, returns JWT |
| GET | `/auth/me` | ✓ | Current user, organization and settings |
| GET | `/products` | ✓ | List products; `?q=` searches name or SKU, `?low_stock=true` filters |
| POST | `/products` | ✓ | Create product (`201`); duplicate SKU → `409` |
| GET | `/products/{id}` | ✓ | Product detail (404 for other tenants) |
| PUT | `/products/{id}` | ✓ | Partial update; duplicate SKU → `409` |
| DELETE | `/products/{id}` | ✓ | Delete product (`204`) |
| POST | `/products/{id}/stock` | ✓ | `{ "operation": "increase"\|"decrease"\|"set", "quantity": n }`; negative result → `400` |
| GET | `/dashboard/summary` | ✓ | `total_products`, `total_stock_quantity`, `low_stock_products`, `inventory_value`, `default_low_stock_threshold` |
| GET | `/dashboard/low-stock` | ✓ | Products at or below their effective threshold |
| GET | `/settings` | ✓ | Organization name + default threshold |
| PUT | `/settings` | ✓ | Update organization name + default threshold |
| GET | `/health` | — | Liveness probe |

Common status codes: `200`, `201`, `204`, `400` (business rule violation such as negative stock), `401` (missing/expired token, bad credentials), `404` (not found or other tenant), `409` (duplicate email/SKU), `422` (validation error with field details).

### Example requests

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Jane Owner","email":"jane@example.com","password":"Secret123","confirm_password":"Secret123","organization_name":"Demo Retail Co"}'

# Create a product (replace TOKEN)
curl -X POST http://localhost:8000/products \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Wireless Mouse","sku":"WM-100","quantity_on_hand":24,"cost_price":8.5,"selling_price":19.99,"low_stock_threshold":5}'

# Adjust stock
curl -X POST http://localhost:8000/products/1/stock \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"operation":"decrease","quantity":20}'
```

---

## 7. Postman testing

1. Start the backend.
2. In Postman: **Import** → `postman/StockFlow.postman_collection.json`.
3. Collection variables: `base_url` = `http://localhost:8000` (or your Render URL); `token` and `product_id` are filled automatically by test scripts.
4. Run the folders in order:
   1. **Authentication → Register** (creates org/user, saves token). If the email already exists, use **Login** instead — or change the email in the body.
   2. **Products → Create product** (saves `product_id`).
   3. Create with the same SKU to verify `409`; search, get, update, adjust stock, try a huge decrease to verify `400`, then delete.
   4. **Dashboard → Summary / Low stock**, **Settings → Get / Update**.
5. To prove isolation: register a second user (different email, different organization), save that token in a separate environment, and call `GET /products/{id}` with the first tenant's product ID — expect `404`.

The collection includes assertions for success codes, duplicate handling and negative-stock rejection.

---

## 8. Automated tests

```bash
cd backend
pytest -q
```

Result: **16 passed** (temporary SQLite database, no impact on dev data). Coverage:

- Registration creates user + organization + settings
- Duplicate email (`409`) and password mismatch (`422`)
- Login, invalid credentials (`401`), `/auth/me`
- Protected endpoints reject missing/invalid tokens (`401`)
- Product create/list/get/update/delete lifecycle
- Duplicate SKU rejected per organization; same SKU allowed across organizations
- Search by name and by SKU
- Stock increase/decrease/set, negative-stock guard (`400`), invalid adjustment (`422`)
- Low-stock detection with per-product and global fallback thresholds, including a threshold change
- Dashboard totals and inventory value math
- Settings read/update + validation
- Organization data isolation (list/get/update/delete/stock all `404` for another tenant)
- Product field validation (negative quantity/price, blank name)

---

## 9. Deployment

### 9.1 Backend → Render

1. Push the repository to GitHub.
2. Render → **New → Web Service**, root directory `backend`.
3. Build command: `pip install -r requirements.txt`
   Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Create a **PostgreSQL** instance (Render or any hosted provider) and set:
   - `DATABASE_URL` = the internal/external connection string (Render's `postgres://` form is normalised automatically)
   - `JWT_SECRET_KEY` = long random value
   - `DEFAULT_LOW_STOCK_THRESHOLD` = `5`
   - `CORS_ORIGINS` = `https://your-frontend.vercel.app`
5. Deploy, then verify `GET https://<service>.onrender.com/health` and `/docs`.
6. Tables are created on first startup (lifespan handler calls `init_db()`).

### 9.2 Frontend → Vercel

1. Vercel → **New Project** → import the repo.
2. Root directory: `frontend` · Framework preset: **Vite**
   Build command: `npm run build` · Output directory: `dist`
3. Environment variable: `VITE_API_URL=https://<service>.onrender.com`
4. Deploy. SPA routes work because Vercel serves Vite's `dist` with `index.html` fallback; if you use a custom rewrite, add `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
5. Update the backend's `CORS_ORIGINS` with the final Vercel URL and redeploy the API.

### 9.3 Deployment checklist

- [ ] `JWT_SECRET_KEY` replaced with a strong random value, never committed
- [ ] PostgreSQL reachable; `DATABASE_URL` set on Render
- [ ] `CORS_ORIGINS` contains the exact frontend origin (scheme + host)
- [ ] `VITE_API_URL` points at the deployed API (no trailing slash)
- [ ] Register → dashboard → product CRUD → stock adjust tested on the deployed URLs
- [ ] Demo data seeded only if desired (`python seed.py` on Render shell)

---

## 10. Design notes

- **Tenant safety** is enforced at the query level, not the UI level: every product query includes `organization_id`, and lookups use both `id` and `organization_id`.
- **Validation is duplicated intentionally** — Pydantic on the server is authoritative, and the React forms give instant feedback (required fields, numeric ranges, password match).
- **Dashboard values** are derived from the same product serialiser used by the table, so cards, low-stock lists and product rows can never disagree.
- **Stock adjustments are atomic per request** and re-check the resulting quantity before committing; the UI previews the post-save quantity and blocks negative results before sending.
- **Currency formatting** uses `Intl.NumberFormat` (USD); inventory value uses cost price (quantity × cost) and products without a cost price contribute 0.
- **Accessibility/responsiveness**: semantic tables, labelled inputs, aria labels on icon buttons, keyboard-friendly modals, and a collapsible sidebar under 992px.

## 11. Troubleshooting

| Symptom | Fix |
| --- | --- |
| “Cannot reach the StockFlow API” | Backend not running, or `VITE_API_URL`/proxy target wrong |
| `401` immediately after login | Stale token in `localStorage`; sign out/in, or clear `stockflow_token` |
| CORS error in deployed UI | Add the exact frontend origin to `CORS_ORIGINS` on Render and restart |
| `psycopg2` build error on Render | Deploy with Python 3.12 or newer; `psycopg2-binary` wheels are provided |
| Duplicate SKU message on edit | Another product in the same organization uses that SKU (case-insensitive) |

---

**Demo credentials after `python seed.py`:** `demo@stockflow.app` / `Demo123!`
