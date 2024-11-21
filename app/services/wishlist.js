import { json } from "@remix-run/node";
import prisma from "../db.server";

// Helper function for error responses
const handleError = (message, error, status = 500) => {
  console.error(message, error);
  return { message, error: error.message || error, status };
};

// Fetch access token from the database
const getAccessToken = async (shop) => {
  const accessTokenRecord = await prisma.session.findFirst({ where: { shop } });
  if (!accessTokenRecord || !accessTokenRecord.accessToken) {
    throw new Error("Access token not found for the shop.");
  }
  return accessTokenRecord.accessToken;
};

// Helper function for encoding GIDs
const encodeGId = (type, id) => Buffer.from(`gid://shopify/${type}/${id}`).toString("base64");

// Shopify GraphQL query helper
const shopifyGraphQL = async (shop, query, variables) => {
  const accessToken = await getAccessToken(shop);
  const graphqlUrl = `https://${shop}/admin/api/2024-10/graphql.json`;

  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Create a wishlist entry for a customer
export async function createWishlist({ customerId, productVariantId, shop, productHandle }) {
  try {
    const result = await fetchProductVariant(shop, productVariantId);
    const productTitle = result?.product?.title || "Unknown Product";
    const wishlist = await prisma.wishlist.create({
      data: { customerId, productVariantId, productHandle, shop, productTitle },
    });


    return { message: "Product added to wishlist", method: "add", variantData: result, data:wishlist };
  } catch (error) {
    return handleError("Error adding product to wishlist", error);
  }
}

// Delete a product from the wishlist
export async function deleteWishlist({ customerId, productVariantId, shop, productHandle }) {
  try {
    const result = await prisma.wishlist.deleteMany({
      where: { customerId, productVariantId, productHandle, shop },
    });

    return { message: "Product removed from wishlist", method: "remove", result };
  } catch (error) {
    return handleError("Error removing product from wishlist", error);
  }
}

// Retrieve wishlist for a customer
export async function getCustomerWishlistedProducts({ customerId, shop }) {
  if (!customerId || !shop) return { message: "Missing customer or shop data", status: 400 };

  try {
    const wishlist = await prisma.wishlist.findMany({ where: { customerId, shop } });
    const variantData = await fetchMultipleProductVariants(shop, wishlist.map((item) => item.productVariantId));

    return { data: wishlist, message: "Wishlist fetched successfully", status: 200, variantData, method: "get" };
  } catch (error) {
    return handleError("Error fetching customer wishlist", error);
  }
}

// Bulk update wishlist (e.g., for guest users or syncing data)
export async function bulkUpdate({ customerId, guestWishlistData, shop }) {
  if (typeof guestWishlistData === "string") {
    try {
      guestWishlistData = JSON.parse(guestWishlistData);
    } catch (error) {
      return handleError("Failed to parse guest wishlist data", error, 400);
    }
  }

  if (!Array.isArray(guestWishlistData)) {
    return { message: "Invalid guest wishlist data, expected an array", status: 400 };
  }

  try {
    const existingItems = await prisma.wishlist.findMany({
      where: {
        customerId,
        shop,
        productVariantId: { in: guestWishlistData.map((item) => item.productVariantId) },
      },
    });

    const existingIds = new Set(existingItems.map((item) => item.productVariantId));
    const newItems = guestWishlistData.filter((item) => !existingIds.has(item.productVariantId));
    const updateItems = newItems.map((item) => ({ ...item, customerId }));

    if (updateItems.length > 0) {
      const addedItems = await prisma.wishlist.createMany({ data: updateItems });
      const variantData = await fetchMultipleProductVariants(shop, updateItems.map((item) => item.productVariantId));
      return { message: "New items added to wishlist", data: addedItems, variantData };
    }

    return { message: "No new items to add" };
  } catch (error) {
    return handleError("Error during bulk update of wishlist", error);
  }
}

// Fetch a single product variant
const fetchProductVariant = async (shop, variantId) => {
  const query =`
    query getProductVariant($id: ID!) {
      productVariant(id: $id) {
        title
        id
        sku
        price
        compareAtPrice
        inventoryQuantity
          image {
          url
        }
        product {
          title
          handle
          description
          featuredMedia {
            preview {
              image {
                url
              }
            }
          }
        }
      }
    }
    `;
  const variables = { id: encodeGId("ProductVariant", variantId) };
  return shopifyGraphQL(shop, query, variables).then((data) => data?.productVariant);
};

// Fetch multiple product variants
const fetchMultipleProductVariants = async (shop, variantIds) => {
  const query = `
    query getProductVariants($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          title
          id
          sku
          price
          compareAtPrice
          inventoryQuantity
            image {
            url
          }
          product {
            title
            handle
            description
            featuredMedia {
              preview {
                image {
                  url
                }
              }
            }
          }
        }
      }
    }
  `;
  const variables = { ids: variantIds.map((id) => encodeGId("ProductVariant", id)) };
  return shopifyGraphQL(shop, query, variables).then((data) => data?.nodes);
};



