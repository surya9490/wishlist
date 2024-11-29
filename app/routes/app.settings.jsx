
import { authenticate } from "../shopify.server";
import { createMetafield, getAppInstallationId, getMetaFieldData } from "../services/settings";
import { json } from "@remix-run/node";
import { defaultConfig, defaultMetaFields } from "../config/settings";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Card, Tabs } from "@shopify/polaris";
import { useCallback, useState } from "react";



export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const appId = await getAppInstallationId(admin);
  const metafieldData = await getMetaFieldData(admin, { namespace: "wishlist", key: "app_settings" });

  if (metafieldData !== null) {
    return json({ data: JSON.parse(metafieldData.node.value) })
  }
  const response = await createMetafield(admin, appId, defaultConfig, defaultMetaFields);
  const data = JSON.parse(response[0].value) || {};
  return json({ data });
}


const tabs = [
  {
    id: 'all-customers-1',
    content: 'All',
    accessibilityLabel: 'All customers',
    panelID: 'all-customers-content-1',
  },
  {
    id: 'accepts-marketing-1',
    content: 'Accepts marketing',
    panelID: 'accepts-marketing-content-1',
  },
  {
    id: 'repeat-customers-1',
    content: 'Repeat customers',
    panelID: 'repeat-customers-content-1',
  },
  {
    id: 'prospects-1',
    content: 'Prospects',
    panelID: 'prospects-content-1',
  },
];
function TabsSection() {
  const [selected, setSelected] = useState(tabs[0]);
  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelected(selectedTabIndex),
    [],
  );
  return (

    <BlockStack gap="500">
      <Card>
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
          
        </Tabs>
      </Card>
    </BlockStack>
  )
}

export default function Settings() {
  const settingsData = useLoaderData();
  console.log(settingsData)
  return (
    <TabsSection />
  )
}