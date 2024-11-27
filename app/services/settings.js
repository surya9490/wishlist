

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

export async function getMetafield(admin, id) {
  try {
    const response = await admin.graphql(
      `#graphql
        query GetMetafields($ownerId: ID!, $namespace: String!, $key: String!) {
          metafields(first: 10, ownerId: $ownerId, namespace: $namespace, key: $key) {
            edges {
              node {
                key
                namespace
                value
                createdAt
                updatedAt
              }
            }
          }
        }`,
      {
        variables: {
          ownerId: id,  // The same ID you used when creating the metafield
          namespace: "data",  // The namespace used in your metafield
          key: "app_settings",  // The key used in your metafield
        },
      }
    );

    const data = await response.json();

    console.log('Fetched Metafields:', data);

    return data;
  } catch (error) {
    console.error("Error handling metafield:", error);
    throw new Response("Failed to create or fetch metafield", { status: 500 });
  }
}


export async function createMetafield(admin, id) {
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
              "key": "app_settings",
              "namespace": "data",
              "ownerId": id,
              "type": "multi_line_text_field",
              "value": "95% Cotton\n5% Spandex"
            }
          ]
        },
      },
    );

    const data = await response.json();

    console.log(data)
    return (data)

  } catch (error) {
    console.error("Error creating metafield:", error);
    throw new Response("Failed to create metafield", { status: 500 });
  }
}

