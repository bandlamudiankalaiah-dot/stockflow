import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ProductForm from "../components/ProductForm";
import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../services/api";
import { createProduct } from "../services/productService";
import { getSettings } from "../services/settingsService";

export default function AddProduct() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [defaultThreshold, setDefaultThreshold] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const settings = await getSettings();
        if (active) setDefaultThreshold(settings.default_low_stock_threshold);
      } catch {
        // Non-blocking: keep the documented 5-unit fallback.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (values) => {
    setServerError("");
    setSubmitting(true);
    try {
      const product = await createProduct(values);
      notify(`${product.name} was added to your inventory.`, "success");
      navigate("/products", { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Unable to create the product."));
    } finally {
      setSubmitting(false);
    }
  };

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
                Add product
              </li>
            </ol>
          </nav>
          <h2 className="sf-section-title">Add product</h2>
          <p className="text-secondary small mb-0">
            Create a new SKU for your organization&apos;s inventory.
          </p>
        </div>
      </div>

      <ProductForm
        defaultThreshold={defaultThreshold}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Create product"
        serverError={serverError}
      />
    </>
  );
}
