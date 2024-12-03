import { json } from "@remix-run/node";
import prisma from "../db.server";
import handleError from "../Helpers/error";


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

// Update the page view count for the given shop
export async function updatePageCount({ shop }) {
  try {
    // Use `upsert` to either create or update the merchant record based on the shop
    await prisma.merchant.upsert({
      where: {
        shop, // Use the unique `shop` field
      },
      update: {
        pageViews: {
          increment: 1, // Increment page views by 1
        },
      },
      create: {
        shop,
        pageViews: 1, // Initialize with 1 page view if the record doesn't exist
      },
    });

    return { success: true, message: "Page view count updated successfully" };
  } catch (error) {
    console.error("Error updating page view count:", error);
    handleError("Error updating page view count", error, 500);
  }
}

// Get the page view count for the given shop
export async function getPageCount({ shop }) {
  try {
    // Fetch the merchant record for the specific shop
    const merchant = await prisma.merchant.findUnique({
      where: {
        shop, // Use the `shop` field to fetch the record
      },
      select: {
        pageViews: true, // Only fetch the pageViews field
      },
    });

    return { pageViews: merchant?.pageViews ?? 0 }; // Return 0 if no record is found
  } catch (error) {
    console.error("Error fetching page view count:", error);
    handleError("Error fetching page view count", error, 500);
  }
}

// Get the total number of wishlist items for the given shop
export async function fetchWishlistCount({ shop }) {
  try {
    const count = await prisma.wishlist.count({
      where: {
        shop,
      },
    });
    return { wishlistCount: count }; // Return the total wishlist count
  } catch (error) {
    console.error("Error fetching wishlist count:", error);
    handleError("Error fetching wishlist count", error, 500);
  }
}

// Get the count of unique customers who have items in their wishlist for the given shop
export async function fetchWishlistCustomerCount({ shop }) {
  try {
    const result = await prisma.wishlist.groupBy({
      by: ['customerId'], // Group by customerId to count unique customers
      where: {
        shop,
      },
      _count: {
        customerId: true, // Count occurrences of customerId
      },
    });

    return { customerCount: result.length }; // Length of the grouped result gives unique customer count
  } catch (error) {
    console.error("Error fetching wishlist customer count:", error);
    handleError("Error fetching wishlist customer count", error, 500);
  }
}

// Get the count of unique product handles in the wishlist for the given shop
export async function fetchUniqProductHandles({ shop }) {
  try {
    const result = await prisma.wishlist.groupBy({
      by: ['productHandle'], // Group by productHandle to count unique product handles
      where: {
        shop,
      },
      _count: {
        productHandle: true, // Count occurrences of productHandle
      },
    });

    return { productHandlesCount: result.length }; // Length of the grouped result gives unique product handle count
  } catch (error) {
    console.error("Error fetching unique product handles count:", error);
    handleError("Error fetching unique product handles count", error, 500);
  }
}

// Fetch all dashboard data in parallel for the given shop
export async function fetchDashboardData({ shop }) {
  try {
    // Fetch data for page views, wishlist items, unique customers, and unique product handles in parallel
    const [pageViews, wishlistedItems, customersCount, productHandlesCount] = await Promise.all([
      getPageCount({ shop }),
      fetchWishlistCount({ shop }),
      fetchWishlistCustomerCount({ shop }),
      fetchUniqProductHandles({ shop }),
    ]);


    return { pageViews: pageViews.pageViews, wishlistedItems: wishlistedItems.wishlistCount, customersCount: customersCount.customerCount, productHandlesCount: productHandlesCount.productHandlesCount }; // Return all data
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    handleError("Error fetching dashboard data", error, 500);
  }
}



export async function fetchTopWishlistedItems({ admin }) {
  try {

    // Step 2: Fetch wishlist counts grouped by productHandle using Prisma
    const topWishlistedItems = await prisma.wishlist.groupBy({
      by: ['productHandle'],
      _count: {
        productHandle: true,
      },
      where: {
        shop: admin.shop, // Use the shop from the authenticated admin
      },
      orderBy: {
        _count: {
          productHandle: 'desc',
        },
      },
      take: 10, // Limit to top 10
    });

    const productHandles = topWishlistedItems.map((item) => item.productHandle);
    const productDetails = [];

    for (const handle of productHandles) {
      const graphqlQuery = `#graphql
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        title
        id
        handle
      }
    }
  `;
      const response = await admin.graphql(graphqlQuery, {
        variables: { handle },
      });

      const shopifyData = await response.json();

      const matchingItem = topWishlistedItems.find(
        (item) => item.productHandle === handle
      );

      // Combine product details with count
      if (shopifyData.data.productByHandle) {
        productDetails.push({
          ...shopifyData.data.productByHandle,
          count: matchingItem._count.productHandle, // Add count to product details
        });
      }

     
    }
    return productDetails;


  } catch (error) {
    console.error('Error fetching top wishlisted items:', error);
    throw new Error('Failed to fetch top wishlisted items');
  }
}

