
export async function getAppInstallationId(admin) {
  try {
    const query = `query GetAppInstallationId  {
        currentAppInstallation {
          id
        }
      }`

    const response = await admin.graphql(query);
    const result = await response.json();
    return result?.data?.currentAppInstallation?.id;
  } catch (error) {
    console.error("Error fetching currentAppInstallation:", error);
    throw new Response('error');
  }
}


export const getMetaFieldData = async (admin, metafield) => {
  const response = await admin.graphql(
    `{
      currentAppInstallation {
        metafields(first: 10,namespace: "${metafield.namespace}") {
          edges {
            node {
              namespace
              key
              value
            }
          }
        }
      }
    }`
  );

  const resData = await response.json();
  if (
    !resData?.data?.currentAppInstallation?.metafields?.edges ||
    resData.data.currentAppInstallation.metafields.edges.length === 0
  ) {
    return null; // No metafields found in the given namespace
  }

  // Find metafield by key
  const metafieldData = resData.data.currentAppInstallation.metafields.edges.find(
    (edge) => edge.node.key === metafield.key
  );

  return metafieldData || null; // Return null if the key doesn't match
};



export async function createMetafield(admin, id, config, defaultMetaFields) {
  try {

    const response = await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          "metafields": [
            {
              "key": defaultMetaFields.key,
              "namespace": defaultMetaFields.namespace,
              "ownerId": id,
              "type": defaultMetaFields.type,
              "value": JSON.stringify(config)
            }
          ]
        },
      },
    );

    const resData = await response.json();
    const data = resData?.data?.metafieldsSet.metafields

    console.log(data)
    return (data)

  } catch (error) {
    console.error("Error creating metafield:", error);
    throw new Response("Failed to create metafield", { status: 500 });
  }
}

