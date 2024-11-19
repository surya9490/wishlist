import { json } from "@remix-run/node";
import prisma from "../db.server";



// Create a wishlist entry for a customer
export async function createWishlist({ customerId, productVariantId, shop, productHandle }) {
  try {
    const wishlist = await prisma.wishlist.create({
      data: {
        customerId,
        productVariantId,
        productHandle,
        shop,
      },
    });
    return {
      message: "Product added to wishlist",
      method: "add",
      wishlist,
    };
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    return {
      message: "Failed to add product to wishlist",
      error: error.message,
      status: 500,
    };
  }
}

// Delete a product from the wishlist
export async function deleteWishlist({ customerId, productVariantId, shop, productHandle }) {
  try {
    const result = await prisma.wishlist.deleteMany({
      where: {
        customerId,
        productVariantId,
        productHandle,
        shop,
      },
    });

    return {
      message: "Product removed from wishlist",
      method: "remove",
      result,
    };
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    return {
      message: "Failed to remove product from wishlist",
      error: error.message,
      status: 500,
    };
  }
}

// Retrieve wishlist for a customer
export async function getCustomerWishlistedProducts({ customerId, shop }) {
  if (!customerId || !shop) {
    return {
      message: "Missing customer or shop data",
      status: 400,
    };
  }

  try {
    const wishlist = await prisma.wishlist.findMany({
      where: {
        customerId,
        shop,
      },
    });

    return {
      data: wishlist,
      message: "Wishlist fetched successfully",
      status: 200,
      method: "get",
    };
  } catch (error) {
    console.error("Error fetching customer wishlist:", error);
    return {
      message: "Failed to fetch wishlist",
      error: error.message,
      status: 500,
    };
  }
}

// Bulk update wishlist (e.g., for guest users or syncing data)
export async function bulkUpdate({ customerId, guestWishlistData, shop }) {

  if (typeof guestWishlistData === "string") {
    try {
      guestWishlistData = JSON.parse(guestWishlistData);
    } catch (error) {
      return {
        message: "Failed to parse guest wishlist data",
        error: error.message,
        status: 400,
      };
    }
  }

  if (!Array.isArray(guestWishlistData)) {
    return {
      message: "Invalid guest wishlist data, expected an array",
      status: 400,
    };
  }

  try {
    const existingItems = await prisma.wishlist.findMany({
      where: {
        customerId,
        shop,
        productVariantId: {
          in: guestWishlistData.map((item) => item.productVariantId),
        },
      },
    });

    const existingIds = new Set(existingItems.map((item) => item.productVariantId));
    const newItems = guestWishlistData.filter((item) => !existingIds.has(item.productVariantId));
    const updateItems = newItems.map((item) => ({
      ...item,
      customerId,
    }));

    if (updateItems.length > 0) {
      const addedItems = await prisma.wishlist.createMany({
        data: updateItems,
      });
      return {
        message: "New items added to wishlist",
        data: addedItems,
      };
    }

    return { message: "No new items to add" };
  } catch (error) {
    console.error("Error during bulk update of wishlist:", error);
    return {
      message: "Unexpected server error",
      error: error.message,
      status: 500,
    };
  }
}



const fetchProduct = async (shop, productHandle) => {
  // Fetch access token from the database
  const accessTokenRecord = await prisma.session.findFirst({ where: { shop } });
  if (!accessTokenRecord || !accessTokenRecord.accessToken) {
    throw new Error("Access token not found for the shop.");
  }
  const accessToken = accessTokenRecord.accessToken;
  console.log("Access Token:------------------", accessToken);

  const query = `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        id
        title
        descriptionHtml
        images(first: 5) {
          edges {
            node {
              id
              url
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price {
                amount
              }
            }
          }
        }
      }
    }
  `;

  const variables = { handle: productHandle };

  // Ensure the shop URL is correctly formatted with https://
 const formattedShop = `https://${shop}`;
 console.log(formattedShop,'-----------------------')
  const graphqlUrl = `${formattedShop}/admin/api/2024-10/graphql.json`;

  console.log("GraphQL URL:------------", graphqlUrl); // Log for debugging

  let response;
  try {
    response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (fetchError) {
    throw new Error(`Network error while fetching product: ${fetchError.message}`);
  }

  // Check if the response is OK
  if (!response.ok) {
    throw new Error(`Error fetching product: ${response.statusText}`);
  }

  // Parse the response JSON
  const data = await response.json();
  if (!data.data || !data.data.product) {
    throw new Error("Product not found in the shop.");
  }

  return data.data.product;
};








