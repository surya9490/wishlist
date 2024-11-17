import { json } from "@remix-run/node";
import { bulkUpdate, createWishlist, deleteWishlist, getCustomerWishlistedProducts } from "../services/wishlist";

export async function loader({ request }) {
  const url = new URL(request.url);
  const customer = url.searchParams.get("customer");
  const shop = url.searchParams.get("shop");
  if (!customer || !shop) {
    return json({
      message: 'missing data',
    })

  }
  const wishlist = await getCustomerWishlistedProducts({ customerId: customer, shop });
  if (!wishlist || wishlist.length === 0) {
    return json({ wishlist: [], message: "No wishlisted products found" });
  }

  // Return the wishlist
  return  wishlist
}

export async function action({ request }) {
  const method = request.method;
  let data = await request.formData();
  data = Object.fromEntries(data);

  const customerId = data?.customerId;
  const productVariantId = data?.productVariantId;
  const shop = data?.shop;
  const productHandle = data?.productHandle;
  const guestWisthlistData = data?.data
  const action = data?._action;

  if ((!customerId || !productVariantId || !shop) && action !== 'bulkCreate') {
    return json({
      message: 'missinga data',
      method: method,
    })
  }

  if ((!customerId || !shop || !guestWisthlistData) && action === 'bulkCreate') {
    return json({
      message: 'missinga data for guest wishlist update',
      method: method,
    })
  }
  console.log('------------>', guestWisthlistData, '<---------')
  if (action === 'add') {
    const response = await createWishlist({ customerId, productVariantId, shop, productHandle });
    return response;
  } else if (action === 'remove') {
    const response = await deleteWishlist({ customerId, productVariantId, shop, productHandle });
    return response;
  } else if (action === 'bulkCreate') {
    const response = await bulkUpdate({ customerId, guestWisthlistData, shop });
    return response;
  }
  return json({ message: "Invalid action" });
}


