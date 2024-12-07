
import { json } from "@remix-run/node";
import { fetchDashboardData, fetchTopWishlistedItems } from "../services/dashboard";
import { authenticate } from "../shopify.server";
import { BlockStack, Box, Card, Divider, Grid, Page, ResourceItem, ResourceList, Spinner, Text } from '@shopify/polaris';
import { useLoaderData, useNavigation } from "@remix-run/react";

export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;
  const [dashboardData, productDetails] = await Promise.all([
    fetchDashboardData({ shop }),
    fetchTopWishlistedItems({ admin, shop }),
  ]);
  return json({ ...dashboardData, productDetails, shop });
}


export default function Dashboard() {
  const navigation = useNavigation();
  const { shop, pageViews, wishlistedItems, customersCount, productHandlesCount, productDetails } = useLoaderData();
  const data = [
    {
      title: 'Wishlisted Page views',
      count: pageViews
    },
    {
      title: 'Total Wishlisted items',
      count: wishlistedItems
    },
    {
      title: 'Total Customers in wishlist',
      count: customersCount
    },
    {
      title: 'Unique products in wishlist',
      count: productHandlesCount
    }

  ]

  if (navigation.state === 'loading') {
    debugger
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner accessibilityLabel="Loading..." size="large" />
    </div>
    );
  }

  return (
    <Page style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="500">
        <Grid>
          {
            data.map((item) => (
              <CardComponent key={item.title} title={item.title} count={item.count} />
            ))
          }
        </Grid>
        {productDetails?.length > 0 && (<Card title="Top 10 Items in Public Wishlists">
          <BlockStack gap={"600"}>
            <Text variant="bodyMd" as="h2">
              Top Wishlisted Products
            </Text>
            <BlockStack gap={"200"}>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 10, sm: 5, md: 5, lg: 10, xl: 10 }}>
                  <Text variant="headingSm" as="h3" >
                    productTitle
                  </Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 2, sm: 1, md: 1, lg: 2, xl: 2 }}>
                  <Text variant="headingSm" as="h3" alignment="end">
                    Count
                  </Text>
                </Grid.Cell>
              </Grid>
              <Divider />
              <ResourceList
                resourceName={{ singular: 'customer', plural: 'customers' }}
                items={productDetails}
                renderItem={(item) => {
                  const { productHandle, title, id, count } = item;
                  const productId = id.split('/').pop();
                  const url = `https://${shop}/admin/products/${productId}`;
                  return (
                    <ResourceItem
                      id={productHandle}
                      title={title}
                      accessibilityLabel={`View details for`}
                    >
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 10, sm: 5, md: 5, lg: 10, xl: 10 }}>
                          <Text variant="bodyMd" as="p" >
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              {title}
                            </a>

                          </Text>
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 2, sm: 1, md: 1, lg: 2, xl: 2 }}>
                          <Text variant="bodyMd" as="p" alignment="end">
                            {count}
                          </Text>
                        </Grid.Cell>
                      </Grid>
                    </ResourceItem>
                  );
                }}
              />
              <Divider />

            </BlockStack>
          </BlockStack>
        </Card>)}

      </BlockStack>
    </Page>
  );
}

function CardComponent({ title, count }) {
  return (
    <Grid.Cell columnSpan={{ xs: 4, sm: 3, md: 3, lg: 4, xl: 4 }}>
      <Card sectioned>
        <Text as="h2" variant="headingSm">
          {title}
        </Text>
        <Box paddingBlock="200">
          <Text as="p" variant="bodyMd">
            {count}
          </Text>
        </Box>
      </Card>
    </Grid.Cell>
  );
}
