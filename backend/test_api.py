"""StockFlow API tests (pytest + FastAPI TestClient).

Run from the backend folder:
    pytest -q

The tests use a temporary SQLite database so they never touch development data.
"""

import os
import tempfile
from pathlib import Path

TEST_DB_PATH = Path(tempfile.mkdtemp(prefix="stockflow-tests-")) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest"
os.environ["DEFAULT_LOW_STOCK_THRESHOLD"] = "5"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(main.app) as test_client:
        yield test_client


def register(client, email, organization="Acme Supplies", password="Secret123"):
    response = client.post(
        "/auth/register",
        json={
            "full_name": "Test Owner",
            "email": email,
            "password": password,
            "confirm_password": password,
            "organization_name": organization,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def auth_headers(auth_payload):
    return {"Authorization": f"Bearer {auth_payload['access_token']}"}


def create_product(client, headers, **overrides):
    payload = {
        "name": "Wireless Mouse",
        "sku": "WM-001",
        "description": "Ergonomic wireless mouse",
        "quantity_on_hand": 20,
        "cost_price": 10.5,
        "selling_price": 19.99,
        "low_stock_threshold": 5,
    }
    payload.update(overrides)
    response = client.post("/products", json=payload, headers=headers)
    return response


# --------------------------------------------------------------------------- #
# Authentication
# --------------------------------------------------------------------------- #
def test_registration_creates_user_and_organization(client):
    data = register(client, "owner@acme.com")
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["organization"]["name"] == "Acme Supplies"
    assert data["user"]["email"] == "owner@acme.com"


def test_duplicate_email_is_rejected(client):
    register(client, "duplicate@acme.com")
    response = client.post(
        "/auth/register",
        json={
            "full_name": "Second Owner",
            "email": "duplicate@acme.com",
            "password": "Secret123",
            "confirm_password": "Secret123",
            "organization_name": "Another Org",
        },
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_registration_password_mismatch_is_rejected(client):
    response = client.post(
        "/auth/register",
        json={
            "full_name": "Mismatch",
            "email": "mismatch@acme.com",
            "password": "Secret123",
            "confirm_password": "Different123",
            "organization_name": "Mismatch Org",
        },
    )
    assert response.status_code == 422


def test_login_and_me(client):
    register(client, "login@acme.com", password="Secret123")
    login = client.post(
        "/auth/login", json={"email": "login@acme.com", "password": "Secret123"}
    )
    assert login.status_code == 200
    payload = login.json()

    me = client.get("/auth/me", headers=auth_headers(payload))
    assert me.status_code == 200
    body = me.json()
    assert body["user"]["email"] == "login@acme.com"
    assert body["settings"]["default_low_stock_threshold"] == 5


def test_invalid_credentials_return_401(client):
    register(client, "wrongpass@acme.com")
    response = client.post(
        "/auth/login", json={"email": "wrongpass@acme.com", "password": "nope-nope"}
    )
    assert response.status_code == 401

    unknown = client.post(
        "/auth/login", json={"email": "ghost@acme.com", "password": "Secret123"}
    )
    assert unknown.status_code == 401


def test_protected_endpoint_requires_token(client):
    assert client.get("/products").status_code == 401
    assert client.get("/dashboard/summary").status_code == 401
    assert client.get("/settings", headers={"Authorization": "Bearer invalid"}).status_code == 401


# --------------------------------------------------------------------------- #
# Products & stock
# --------------------------------------------------------------------------- #
def test_product_crud_flow(client):
    auth = register(client, "crud@acme.com")
    headers = auth_headers(auth)

    created = create_product(client, headers)
    assert created.status_code == 201, created.text
    product = created.json()
    assert product["sku"] == "WM-001"
    assert product["is_low_stock"] is False
    assert product["status"] == "In Stock"
    assert product["inventory_value"] == pytest.approx(20 * 10.5)
    product_id = product["id"]

    listed = client.get("/products", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    fetched = client.get(f"/products/{product_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Wireless Mouse"

    updated = client.put(
        f"/products/{product_id}",
        json={"name": "Wireless Mouse Pro", "selling_price": 24.5},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Wireless Mouse Pro"
    assert updated.json()["selling_price"] == pytest.approx(24.5)
    assert updated.json()["quantity_on_hand"] == 20

    deleted = client.delete(f"/products/{product_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/products/{product_id}", headers=headers).status_code == 404


def test_duplicate_sku_is_rejected_per_organization(client):
    auth = register(client, "sku@acme.com", organization="SKU Org")
    headers = auth_headers(auth)

    assert create_product(client, headers, sku="ABC-1").status_code == 201
    duplicate = create_product(client, headers, name="Other", sku="abc-1")
    assert duplicate.status_code == 409
    assert "already exists" in duplicate.json()["detail"]


def test_same_sku_allowed_in_different_organizations(client):
    first = register(client, "org1@acme.com", organization="Org One")
    second = register(client, "org2@acme.com", organization="Org Two")

    assert create_product(client, auth_headers(first), sku="SHARED-1").status_code == 201
    assert create_product(client, auth_headers(second), sku="SHARED-1").status_code == 201


def test_search_by_name_and_sku(client):
    auth = register(client, "search@acme.com")
    headers = auth_headers(auth)
    create_product(client, headers, name="Mechanical Keyboard", sku="KB-100")
    create_product(client, headers, name="USB Cable", sku="CBL-9")

    by_name = client.get("/products", params={"q": "keyboard"}, headers=headers)
    assert by_name.status_code == 200
    assert [item["sku"] for item in by_name.json()["items"]] == ["KB-100"]

    by_sku = client.get("/products", params={"q": "cbl"}, headers=headers)
    assert [item["name"] for item in by_sku.json()["items"]] == ["USB Cable"]

    no_match = client.get("/products", params={"q": "zzz"}, headers=headers)
    assert no_match.json()["total"] == 0


def test_stock_adjustments_and_negative_guard(client):
    auth = register(client, "stock@acme.com")
    headers = auth_headers(auth)
    product = create_product(client, headers, quantity_on_hand=10).json()
    product_id = product["id"]

    increased = client.post(
        f"/products/{product_id}/stock",
        json={"operation": "increase", "quantity": 5},
        headers=headers,
    )
    assert increased.status_code == 200
    assert increased.json()["quantity_on_hand"] == 15

    decreased = client.post(
        f"/products/{product_id}/stock",
        json={"operation": "decrease", "quantity": 7},
        headers=headers,
    )
    assert decreased.json()["quantity_on_hand"] == 8

    too_much = client.post(
        f"/products/{product_id}/stock",
        json={"operation": "decrease", "quantity": 100},
        headers=headers,
    )
    assert too_much.status_code == 400
    assert "negative" in too_much.json()["detail"]

    set_quantity = client.post(
        f"/products/{product_id}/stock",
        json={"operation": "set", "quantity": 3},
        headers=headers,
    )
    assert set_quantity.status_code == 200
    assert set_quantity.json()["quantity_on_hand"] == 3
    assert set_quantity.json()["is_low_stock"] is True

    invalid = client.post(
        f"/products/{product_id}/stock",
        json={"operation": "decrease", "quantity": 0},
        headers=headers,
    )
    assert invalid.status_code == 422


def test_low_stock_detection_uses_product_or_global_threshold(client):
    auth = register(client, "low@acme.com")
    headers = auth_headers(auth)

    # Explicit threshold 10, quantity 10 -> low stock
    create_product(
        client, headers, name="Low Explicit", sku="LOW-1", quantity_on_hand=10, low_stock_threshold=10
    )
    # No threshold -> organization default of 5, quantity 6 -> in stock
    create_product(
        client, headers, name="Default Ok", sku="DEF-1", quantity_on_hand=6, low_stock_threshold=None
    )
    # No threshold -> quantity 5 -> low stock
    create_product(
        client, headers, name="Default Low", sku="DEF-2", quantity_on_hand=5, low_stock_threshold=None
    )

    low_stock = client.get("/dashboard/low-stock", headers=headers)
    assert low_stock.status_code == 200
    skus = {item["sku"] for item in low_stock.json()["items"]}
    assert skus == {"LOW-1", "DEF-2"}

    # Changing the global default to 6 makes the 6-unit product low stock too.
    client.put(
        "/settings",
        json={"organization_name": "Low Org", "default_low_stock_threshold": 6},
        headers=headers,
    )
    refreshed = client.get("/dashboard/low-stock", headers=headers)
    assert {item["sku"] for item in refreshed.json()["items"]} == {"LOW-1", "DEF-2", "DEF-1"}


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
def test_dashboard_summary_calculations(client):
    auth = register(client, "dash@acme.com")
    headers = auth_headers(auth)

    create_product(
        client, headers, name="A", sku="DASH-A", quantity_on_hand=10, cost_price=2.5, low_stock_threshold=3
    )
    create_product(
        client, headers, name="B", sku="DASH-B", quantity_on_hand=2, cost_price=10, low_stock_threshold=5
    )
    create_product(
        client, headers, name="C", sku="DASH-C", quantity_on_hand=0, cost_price=None, low_stock_threshold=1
    )

    summary = client.get("/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_products"] == 3
    assert body["total_stock_quantity"] == 12
    assert body["low_stock_products"] == 2
    assert body["inventory_value"] == pytest.approx(10 * 2.5 + 2 * 10 + 0)


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
def test_settings_read_and_update(client):
    auth = register(client, "settings@acme.com", organization="Old Name")
    headers = auth_headers(auth)

    fetched = client.get("/settings", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["organization_name"] == "Old Name"
    assert fetched.json()["default_low_stock_threshold"] == 5

    updated = client.put(
        "/settings",
        json={"organization_name": "New Name", "default_low_stock_threshold": 9},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["organization_name"] == "New Name"
    assert updated.json()["default_low_stock_threshold"] == 9

    invalid = client.put(
        "/settings",
        json={"organization_name": "  ", "default_low_stock_threshold": -1},
        headers=headers,
    )
    assert invalid.status_code == 422


# --------------------------------------------------------------------------- #
# Multi-tenant isolation
# --------------------------------------------------------------------------- #
def test_organization_data_isolation(client):
    tenant_a = register(client, "tenant-a@acme.com", organization="Tenant A")
    tenant_b = register(client, "tenant-b@acme.com", organization="Tenant B")
    headers_a = auth_headers(tenant_a)
    headers_b = auth_headers(tenant_b)

    product_a = create_product(
        client, headers_a, name="Tenant A Product", sku="ISO-A", quantity_on_hand=50
    ).json()

    # Tenant B must not see, read, update, delete or adjust Tenant A's product.
    list_b = client.get("/products", headers=headers_b).json()
    assert list_b["total"] == 0
    assert client.get(f"/products/{product_a['id']}", headers=headers_b).status_code == 404
    assert (
        client.put(
            f"/products/{product_a['id']}", json={"name": "Hijacked"}, headers=headers_b
        ).status_code
        == 404
    )
    assert client.delete(f"/products/{product_a['id']}", headers=headers_b).status_code == 404
    assert (
        client.post(
            f"/products/{product_a['id']}/stock",
            json={"operation": "set", "quantity": 0},
            headers=headers_b,
        ).status_code
        == 404
    )

    # Tenant A's data is untouched and its dashboard only counts its own rows.
    still_there = client.get(f"/products/{product_a['id']}", headers=headers_a)
    assert still_there.status_code == 200
    assert still_there.json()["quantity_on_hand"] == 50
    assert client.get("/dashboard/summary", headers=headers_a).json()["total_products"] == 1
    assert client.get("/dashboard/summary", headers=headers_b).json()["total_products"] == 0


def test_validation_errors_for_products(client):
    auth = register(client, "validation@acme.com")
    headers = auth_headers(auth)

    negative_quantity = create_product(client, headers, quantity_on_hand=-1)
    assert negative_quantity.status_code == 422

    blank_name = create_product(client, headers, name="   ", sku="BLANK-1")
    assert blank_name.status_code == 422

    negative_price = create_product(client, headers, cost_price=-5)
    assert negative_price.status_code == 422
