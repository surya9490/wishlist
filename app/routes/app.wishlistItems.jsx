import { json } from "@remix-run/node";
import { fetchWishlistedItems } from "../services/admin-services";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "@remix-run/react";

export async function loader({request}) {
  const { admin } = await authenticate.admin(request);
  const {shop} = admin
  const wishlistData = await fetchWishlistedItems(shop)
   return json({wishlistData})
}


export default function ShowWishListedItems() {
  const loader = useLoaderData()
  console.log(loader)
}