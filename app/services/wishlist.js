import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";


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
  console.log("guestWishlistData", guestWishlistData,typeof guestWishlistData);
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
        data:addedItems,
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



