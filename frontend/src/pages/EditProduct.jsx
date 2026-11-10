import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Loader from "../components/Loader";
import ProductForm from "../components/ProductForm";
import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../services/api";
import { getProduct, updateProduct } from "../services/productService";
import { getSettings } from "../services/settingsService";
import { formatDate } from "../utils/format";

function toFormValues(product) {
  return {
    name: product.name,
    sku: product.sku,
    description: product.description || "",
    quantity_on_hand: String(product.quantity_on_hand),
    cost_price: product.cost_price === null ? "" : String(product.cost_price),
    selling_price: product.selling_price === null ? "" : String(product.selling_price),
    low_stock_threshold:
      product.low_stock_threshold === null ? "" : String(product.low_stock_threshold),
  };
}

export default function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [product, setProduct] = useState(null);
  const [defaultThreshold, setDefaultThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      setError("");
      try {
        const [productData, settingsData] = await Promise.all([
          getProduct(productId),
          getSettings().catch(() => null),
        ]);
        if (!active) return;
        setProduct(productData);
        if (settingsData) setDefaultThreshold(settingsData.default_low_stock_threshold);
      } catch (err) {
        if (!active) return;
        if (err?.response?.status === 404) setNotFound(true);
        else setError(getApiErrorMessage(err, "Unable to load this product."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [productId]);

  const handleSubmit = async (values) => {
    setServerError("");
    setSubmitting(true);
    try {
      const updated = await updateProduct(productId, values);
      notify(`${updated.name} was updated.`, "success");
      navigate("/products", { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Unable to update the product."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sf-panel">
        <Loader label="Loading product…" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="sf-panel">
        <div className="sf-empty">
          <div className="sf-empty-icon">
            <i className="bi bi-search" aria-hidden="true" />
          </div>
          <h6 className="fw-semibold mb-1">Product not found</h6>
          <p className="text-secondary small mb-3">
            This product does not exist in your organization, or it was deleted.
          </p>
          <Link to="/products" className="btn btn-primary btn-sm">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
        <span className="small">{error}</span>
        <Link to="/products" className="btn btn-sm btn-light">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="sf-page-head">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb sf-breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link to="/products">Products</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {product.name}
              </li>
            </ol>
          </nav>
          <h2 className="sf-section-title">Edit product</h2>
          <p className="text-secondary small mb-0">
            Created {formatDate(product.created_at)} · Last updated {formatDate(product.updated_at)}
          </p>
        </div>
      </div>

      <ProductForm
        initialValues={toFormValues(product)}
        defaultThreshold={defaultThreshold}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save changes"
        serverError={serverError}
      />
    </>
  );
}
