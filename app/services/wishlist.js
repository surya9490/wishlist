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

    return json({
      message: 'Product added to wishlist',
      method: 'POST',
      wishlist, // Corrected typo 'wishtlist' to 'wishlist'
    });
  } catch (error) {
    console.error('Error adding product to wishlist:', error);
    return json({ message: 'Failed to add product to wishlist', error: error.message }, { status: 500 });
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

    return json({
      message: 'Product removed from wishlist',
      method: 'DELETE',
      result,
    });
  } catch (error) {
    console.error('Error removing product from wishlist:', error);
    return json({ message: 'Failed to remove product from wishlist', error: error.message }, { status: 500 });
  }
}

// Retrieve wishlist for a customer
export async function getCustomerWishlistedProducts({ customerId, shop }) {
  if (!customerId || !shop) {
    return json({ message: 'Missing customer or shop data' }, { status: 400 });
  }

  try {
    const wishlist = await prisma.wishlist.findMany({
      where: {
        customerId,
        shop,
      },
    });

    return json({ data: wishlist, message: 'Wishlist fetched successfully' });
  } catch (error) {
    console.error('Error fetching customer wishlist:', error);
    return json({ message: 'Failed to fetch wishlist', error: error.message }, { status: 500 });
  }
}

// Bulk update wishlist (e.g., for guest users or syncing data)
export async function bulkUpdate({ customerId, guestWisthlistData, shop }) {
  if (typeof guestWisthlistData === 'string') {
    try {
      guestWisthlistData = JSON.parse(guestWisthlistData);
    } catch (error) {
      return json({ message: 'Failed to parse guest wishlist data', error: error.message }, { status: 400 });
    }
  }

  if (!Array.isArray(guestWisthlistData)) {
    return json({ message: 'Invalid guest wishlist data, expected an array' }, { status: 400 });
  }

  try {
    // Fetch existing wishlist items for the customer and shop
    const existingItems = await prisma.wishlist.findMany({
      where: {
        customerId,
        shop,
        productVariantId: { in: guestWisthlistData.map(item => item.productVariantId) },
      },
    });

    const existingIds = new Set(existingItems.map(item => item.productVariantId));

    // Separate new items that are not yet in the wishlist
    const newItems = guestWisthlistData.filter(item => !existingIds.has(item.productVariantId));
    const updateItems = newItems.map(item => ({
      ...item,
      customerId,
    }));

    // Bulk insert new items if there are any
    if (updateItems.length > 0) {
      const addedItems = await prisma.wishlist.createMany({
        data: updateItems,
      });
      return json({
        message: 'New items added to wishlist',
        addedItems,
      });
    }

    return json({ message: 'No new items to add' });
  } catch (error) {
    console.error('Error during bulk update of wishlist:', error);
    return json({ message: 'Unexpected server error', error: error.message }, { status: 500 });
  }
}
