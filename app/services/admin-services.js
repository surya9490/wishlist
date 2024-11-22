import { json } from "@remix-run/node";
import prisma from "../db.server";


export async function fetchWishlistedItems(shop, page = 1, pageSize = 100) {
  try {
    const skip = (page - 1) * pageSize;
    const wishlistedItems = await prisma.wishlist.findMany({
      where: {
        shop: shop,
      },
      take: pageSize,
      skip: skip,
      orderBy: {
        createdAt: "desc", // Optional: Adjust ordering as needed
      },
    });

    return wishlistedItems;
  } catch (error) {
    console.error("Error fetching wishlisted items:", error);
    throw new Error("Failed to fetch wishlisted items.");
  }
}