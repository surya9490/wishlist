import { json } from "@remix-run/node";
import {
  bulkUpdate,
  createWishlist,
  deleteWishlist,
  fetchProductData,
  getCustomerWishlistedProducts,
  getSearchResults,
} from "../services/wishlist";
import { cors } from "remix-utils/cors";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customer");
    const shop = url.searchParams.get("shop");

    if (!customerId || !shop) {
      return await cors(request, json({ message: "Missing customer or shop data" }, { status: 400 }));
    }

    const wishlist = await getCustomerWishlistedProducts({ customerId, shop });

    if (!wishlist || wishlist.length === 0) {
      return await cors(request, json({ wishlist: [], message: "No wishlisted products found" }));
    }

    return await cors(request, json({ ...wishlist }));
  } catch (error) {
    console.error("Loader Error:", error);
    return await cors(request, json({ message: "Failed to fetch wishlist", error: error.message }, { status: 500 }));
  }
}

export async function action({ request }) {
  try {
    const method = request.method;
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    const {
      customerId,
      productVariantId,
      shop,
      productHandle,
      variantData,
      action,
      query,
    } = data;

    if (!action) {
      return await cors(request, json({ message: "Missing action", method }, { status: 400 }));
    }

    switch (action) {
      case "add": {
        if (!productVariantId || !productHandle || !customerId || !shop) {
          return await cors(request, json({ message: "Missing product data for add action" }, { status: 400 }));
        }
        const response = await createWishlist({ customerId, productVariantId, shop, productHandle });
        return await cors(request, json({ ...response }));
      }

      case "remove": {
        if (!productVariantId || !customerId || !shop) {
          return await cors(request, json({ message: "Missing product data for remove action" }, { status: 400 }));
        }
        const response = await deleteWishlist({ customerId, productVariantId, shop, productHandle });
        return await cors(request, json({ ...response }));
      }

      case "bulkCreate": {
        if (!variantData || !customerId || !shop) {
          return await cors(request, json({ message: "Missing data for bulk create action" }, { status: 400 }));
        }
        const response = await bulkUpdate({ customerId, variantData, shop });
        return await cors(request, json({ ...response }));
      }

      case "fetch": {
        if (!productVariantId || !shop) {
          return await cors(request, json({ message: "Missing data" }, { status: 400 }));
        }
        const response = await fetchProductData(shop, productVariantId);
        return await cors(request, json({ ...response }));
      }

      case "search":
      case "view": {
        if (!shop || !customerId) {
          return await cors(request, json({ message: "Missing data" }, { status: 400 }));
        }
        const response = await getSearchResults(shop, query, customerId, action);
        return await cors(request, json({ ...response }));
      }

      default:
        return await cors(request, json({ message: "Invalid action" }, { status: 400 }));
    }
  } catch (error) {
    console.error("Action Error:", error);
    return await cors(request, json({ message: "Failed to perform action", error: error.message }, { status: 500 }));
  }
}
