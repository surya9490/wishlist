import { json } from "@remix-run/node";
import prisma from "../db.server";


export async function createWishlist({ customerId, productVariantId, shop }) {
  const wishlist = await prisma.wishlist.create({
    data: {
      customerId,
      productVariantId,
      shop,
    },
  });

  const response = json({
    message: 'product added to wishlist',
    method: 'POST',
    wishtlist: wishlist
  })
  return response;
}

export async function deleteWishlist({ customerId, productVariantId, shop }) {
  const wishlist = await prisma.wishlist.deleteMany({
    where: {
      customerId,
      productVariantId,
      shop,
    },
  });
  const response = json({
    message: 'product removed from wishlist',
    method: 'DELETE',
    wishtlist: wishlist
  })
  return response;
}

export async function getCustomerWishlitedProducts({ customerId, shop }) {
  if (!customerId || !shop) {
    return json({
      message: 'missing data',
    })
  }

  // Fetch wishlist from the database
  const wishlist = await prisma.wishlist.findMany({
    where: {
      customerId,
      shop,
    },
  });
  return wishlist
}
