import { json } from "@remix-run/node";
import {
  bulkUpdate,
  createWishlist,
  deleteWishlist,
  fetchProductData,
  getCustomerWishlistedProducts,
} from "../services/wishlist";
import { cors } from "remix-utils/cors";
import {authenticate} from '../shopify.server';

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customer");
    const shop = url.searchParams.get("shop");

    const {storefront} = await authenticate.public.appProxy(request);

    if (!storefront) {
      return new Response();
    }

    if (!customerId || !shop) {
      return json({ message: "Missing customer or shop data" }, { status: 400 });
    }

    const wishlist = await getCustomerWishlistedProducts({ customerId, shop });

    if (!wishlist || wishlist.length === 0) {
      return json({ wishlist: [], message: "No wishlisted products found" });
    }

    return json({ ...wishlist });
  } catch (error) {
    console.error("Loader Error:", error);
    return json({ message: "Failed to fetch wishlist", error: error.message }, { status: 500 });
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
      productHandle, data:guestWishlistData,
      _action: action,
    } = data;


    if (!action) {
      return json({ message: "Missing action", method }, { status: 400 });
    }

    if (!customerId || !shop) {
      return json({ message: "Missing customer or shop data", method }, { status: 400 });
    }

    switch (action) {
      case "add": {
        if (!productVariantId || !productHandle) {
          return json({ message: "Missing product data for add action" }, { status: 400 });
        }
        const response = await createWishlist({ customerId, productVariantId, shop, productHandle });
        return json({ message: "Product added to wishlist", data: response });
      }

      case "remove": {
        if (!productVariantId || !productHandle) {
          return json({ message: "Missing product data for remove action" }, { status: 400 });
        }
        const response = await deleteWishlist({ customerId, productVariantId, shop, productHandle });
        return json({ message: "Product removed from wishlist", data: response });
      }

      case "bulkCreate": {
        if (!guestWishlistData) {
          return json({ message: "Missing data for bulk create action" }, { status: 400 });
        }
        const response = await bulkUpdate({ customerId, guestWishlistData, shop });
        return json({ message: "Wishlist updated for guest user", data: response });
      }

      default:
        return json({ message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Action Error:", error);
    return json({ message: "Failed to perform action", error: error.message }, { status: 500 });
  }
}
