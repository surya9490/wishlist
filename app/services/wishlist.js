
import prisma from "../db.server";
import handleError from "../Helpers/error";
import shopifyGraphQL from "../Helpers/graphqlQuery";
import {  updatePageCount } from "./dashboard";

// Helper function for encoding GIDs
const encodeGId = (type, id) => Buffer.from(`gid://shopify/${type}/${id}`).toString("base64");



// Create a wishlist entry for a customer
export async function createWishlist({ customerId, productVariantId, shop, productHandle }) {
  try {
    console.time("createWishlist");
    const result = await fetchProductVariant(shop, productVariantId);
    const productTitle = result?.product?.title || "Unknown Product";
    const [wishlist, variantData] = await Promise.all([
      prisma.wishlist.create({ data: { customerId, productVariantId, productHandle, shop, productTitle }, }),
      fetchProductVariant(shop, productVariantId),
    ]);
    const count = await fetchWishlistCount(shop, customerId);
    console.timeEnd("createWishlist");
    return { message: "Product added to wishlist", method: "add", count, variantData: [variantData], wishlisted: [wishlist] };
  } catch (error) {
    return handleError("Error adding product to wishlist", error);
  }
}

// Delete a product from the wishlist
export async function deleteWishlist({ customerId, productVariantId, shop, productHandle }) {
  try {
    const [result, variantData] = await Promise.all([
      prisma.wishlist.deleteMany({ where: { customerId, productVariantId, productHandle, shop } }),
      fetchProductVariant(shop, productVariantId),
    ])
    const count = await fetchWishlistCount(shop, customerId);
    return { message: "Product removed from wishlist", method: "remove", count, result, variantData: [variantData] };
  } catch (error) {
    return handleError("Error removing product from wishlist", error);
  }
}

// Retrieve wishlist for a customer
export async function getCustomerWishlistedProducts({ customerId, shop }) {
  if (!customerId || !shop) return { message: "Missing customer or shop data", status: 400 };

  try {
    const wishlisted = await prisma.wishlist.findMany({ where: { customerId, shop } });
    const [variantData, count] = await Promise.all([
      fetchMultipleProductVariants(shop, wishlisted.map((item) => item.productVariantId)),
      fetchWishlistCount(shop, customerId)
    ])

    return { wishlisted, variantData, count, message: "Wishlist fetched successfully", status: 200, };
  } catch (error) {
    return handleError("Error fetching customer wishlist", error);
  }
}

// Bulk update wishlist (e.g., for guest users or syncing data)
export async function bulkUpdate({ customerId, variantData, shop }) {

  if (typeof variantData === "string") {
    try {
      variantData = JSON.parse(variantData);
    } catch (error) {
      return handleError("Failed to parse guest wishlist data", error, 400);
    }
  }

  if (!Array.isArray(variantData)) {
    return { message: "Invalid guest wishlist data. Expected an array.", status: 400 };
  }

  try {
    // Find existing wishlist items
    const existingItems = await prisma.wishlist.findMany({
      where: {
        customerId,
        shop,
        productVariantId: { in: variantData },
      },
    });

    // Get IDs of existing items
    const existingIds = new Set(existingItems.map((item) => item.productVariantId));

    // Filter new items that are not already in the wishlist
    const newItems = variantData.filter((id) => !existingIds.has(id)); // Compare directly with IDs

    // Prepare new items for creation
    const updateItems = newItems.map((productVariantId) => ({
      productVariantId,
      customerId,
      shop,
    }));

    if (updateItems.length > 0) {
      // Add new items to the wishlist
      const addedItems = await prisma.wishlist.createMany({ data: updateItems });

      // Fetch product variant data for the newly added items
      const variantDataDetails = await fetchMultipleProductVariants(
        shop,
        updateItems.map((item) => item.productVariantId)
      );

      const count = await fetchWishlistCount(shop, customerId);

      return {
        message: "New items added to wishlist",
        wishlisted: addedItems,
        variantData: variantDataDetails,
        count
      };
    }

    return { message: "No new items to add" };
  } catch (error) {
    return handleError("Error during bulk update of wishlist", error);
  }

}

export async function fetchProductData(shop, productVariantId) {
  try {
    const result = await fetchProductVariant(shop, productVariantId);
    return { variantData: [result], message: "Product data fetched successfully", status: 200 };
  } catch (error) {

  }
}

export async function getSearchResults(shop, query, customerId, action) {
  try {
    const whereCondition = {
      shop,
      customerId,
      ...(query && {
        productTitle: {
          contains: query.toLowerCase(),
          mode: "insensitive", // Ensure case-insensitive matching
        },
      }),
    };

    // Fetch wishlist items based on condition
    const matchingItems = await prisma.wishlist.findMany({
      where: whereCondition,
      select: {
        productVariantId: true, // Select only the required fields for efficiency
        productTitle: true,
        customerId: true,
        shop: true,
        productHandle: true
      },
    });

    // Fetch variant data only if there are matching items
    const variantData =
      matchingItems.length > 0
        ? await fetchMultipleProductVariants(
          shop,
          matchingItems.map((item) => item.productVariantId)
        )
        : [];

    if (action === 'view') updatePageCount({ customerId, shop });

    // Return results based on the fetched data
    if (variantData.length > 0) {
      return { message: "Matching items found", variantData: variantData, wishlisted: matchingItems };
    } else {
      return { message: "No matching items found", data: matchingItems };
    }
  } catch (error) {
    // Improved error handling
    console.error("Error fetching wishlist items:", error);
    throw new Error("Error fetching wishlist items");
  }
}

export async function fetchWishlistCount(shop, customerId) {
  try {
    const count = await prisma.wishlist.count({
      where: {
        customerId,
        shop,
      },
    });
    return count;
  } catch (error) {
    console.error("Error fetching wishlist count:", error);
    throw new Error("Error fetching wishlist count");
  }
}


// Fetch a single product variant
const fetchProductVariant = async (shop, variantId) => {
  const query = `
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



