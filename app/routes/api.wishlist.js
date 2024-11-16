import { json } from "@remix-run/node";
import { createWishlist, deleteWishlist, getCustomerWishlitedProducts } from "../services/wishlist";

export async function loader({ request }) {
  const url = new URL(request.url);
  const customer = url.searchParams.get("customer");
  const shop = url.searchParams.get("shop");
  if (!customer || !shop) {
    return json({
      message: 'missing data',
    })

  }
  const wishlist = await getCustomerWishlitedProducts({ customerId: customer, shop });
  if (!wishlist || wishlist.length === 0) {
    return json({ wishlist: [], message: "No wishlisted products found" });
  }

  // Return the wishlist
  return json({ wishlist,message: "Wishlisted products found" });
}

export async function action({ request }) {
  const method = request.method;
  let data = await request.formData();
  data = Object.fromEntries(data);
  const customerId = data.customerId;
  const productVariantId = data.productVariantId;
  const shop = data.shop;
  const action = data._action;

  if (!customerId || !productVariantId || !shop) {
    return json({
      message: 'missinga data',
      method: method,
    })
  }

  if (action === 'create') {
    const response = await createWishlist({ customerId, productVariantId, shop });
    return response;
  } else if(action === 'delete'){
    const response = await deleteWishlist({ customerId, productVariantId, shop });
    return response;
  }
}


