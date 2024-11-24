
import { json } from "@remix-run/node";
import { fetchDashboardData, fetchTopWishlistedItems } from "../services/dashboard";
import { authenticate } from "../shopify.server";
import { BlockStack, Box, Card, DataTable, Divider, Grid, Page, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { Link, Links, useLoaderData } from "@remix-run/react";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const [dashboardData, topWishlistedItems] = await Promise.all([
    fetchDashboardData({ shop }),
    fetchTopWishlistedItems({ shop }),
  ]);
  return json({ ...dashboardData, topWishlistedItems });
}


export default function Dashboard() {
  const { pageViews, wishlistedItems, customersCount, productHandlesCount, topWishlistedItems } = useLoaderData();
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

  console.log(topWishlistedItems, '--------------')



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
        <Card title="Top 10 Items in Public Wishlists">
          <BlockStack gap={"600"}>
            <Text variant="headingSm" as="h2">
              Top Wishlisted Products
            </Text>
            <ResourceList
              resourceName={{ singular: 'customer', plural: 'customers' }}
              items={topWishlistedItems}
              renderItem={(item) => {
                const { productHandle, productTitle, productVariantId, count, shop } = item;
                const url = `https://${shop}/admin/products/${productVariantId}`;
                return (
                  <ResourceItem
                    id={productHandle}
                    title={productTitle}
                    url={url}
                    accessibilityLabel={`View details for`}
                  >
                    <Grid>
                      <Grid.Cell columnSpan={{xs: 10, sm: 5, md: 5, lg: 10, xl: 10}}>
                        <Text variant="bodyMd" as="p" >
                          {productTitle}
                        </Text>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{xs: 2, sm: 1, md: 1, lg: 2, xl: 2}}>
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
        </Card>

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
