import getAccessToken from "./generateToken";

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

export default shopifyGraphQL;