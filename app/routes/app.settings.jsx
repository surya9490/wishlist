
import { authenticate } from "../shopify.server";
import { createMetafield, getAppInstallationId, getMetaFieldData } from "../services/settings";
import { json } from "@remix-run/node";
import { defaultConfig, defaultMetaFields } from "../config/settings";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { BlockStack, Box, Button, Card, Checkbox, Divider, Grid, InlineGrid, Page, Tabs, Text } from "@shopify/polaris";
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

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const config = JSON.parse(formData.get("config"));
  const appId = await getAppInstallationId(admin);
  const response = await createMetafield(admin, appId, config) || {};
  const data = response[0].value
  return json({ data });
}


// Define Tabs
const tabs = [
  {
    id: "general",
    content: "General",
    panelID: "general-content",
    settingsComponent: GeneralSettings,
  },
  {
    id: "button",
    content: "Button",
    panelID: "button-content",
    settingsComponent: ButtonSettings,
  },
  {
    id: "notification",
    content: "Notification",
    panelID: "notification-content",
    settingsComponent: NotificationSettings,
  },
  {
    id: "language",
    content: "Language",
    panelID: "language-content",
    settingsComponent: LanguageSettings,
  },
];

function TabsSection({ config, onUpdateConfig }) {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTabIndex(selectedTabIndex),
    []
  );

  // Dynamically render the settings component for the selected tab
  const CurrentSettings = tabs[selectedTabIndex].settingsComponent;

  return (
    <BlockStack gap="5">
      {/* Tabs Component */}
      <Tabs
        tabs={tabs}
        selected={selectedTabIndex}
        onSelect={handleTabChange}
      />

      {/* Content Rendering */}
      <BlockStack>
        <CurrentSettings config={config} onUpdateConfig={onUpdateConfig} />
      </BlockStack>
    </BlockStack>
  );
}


// Main Component
export default function Settings() {
  const settingsData = useLoaderData();
  const [config, setConfig] = useState(settingsData.data);

  // Handle Save Action
  const submit = useSubmit();
  const handleSave = () => {
    const formData = new FormData();
    formData.append("config", JSON.stringify(config));

    submit(formData, { method: "post" });
  };

  // Update Configuration
  const handleUpdateConfig = (updatedConfig) => {
    setConfig((prev) => ({
      ...prev,
      ...updatedConfig,
    }));
  };

  return (
    <>
      <Button onClick={handleSave}>Save</Button>
      <Page style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <TabsSection config={config} onUpdateConfig={handleUpdateConfig} />
        {/* Save Button */}

      </Page>
    </>
  );
}

// General Settings Component
function GeneralSettings({ config, onUpdateConfig }) {
  const handleChange = (newChecked, name) => {
    if (name === "showWishlist") {
      onUpdateConfig({ showWishlist: newChecked });
    } else if (name === "variantDetection") {
      onUpdateConfig({
        options: {
          ...config.options,
          variantChange: newChecked,
        },
      });
    }
  };

  return (
    <BlockStack gap="500">
      <BlockStack gap={{ xs: "800", sm: "400" }}>
        <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: 400, sm: 0 }}
            paddingInlineEnd={{ xs: 400, sm: 0 }}
          >
            <BlockStack gap="400">
              <Text variant="bodyMd">Show Wishlist</Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <Grid alignItems="center" justifyContent="space-between">
              <Grid.Cell columnSpan={{ sm: 5, lg: 10 }}>
                <Text variant="bodyMd">Show Wishlist</Text>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ sm: 1, lg: 2 }}>
                <Checkbox
                  name="showWishlist"
                  checked={config.showWishlist || false}
                  onChange={(newChecked) =>
                    handleChange(newChecked, "showWishlist")
                  }
                />
              </Grid.Cell>
            </Grid>
          </Card>
        </InlineGrid>
        <Divider />
        <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: 400, sm: 0 }}
            paddingInlineEnd={{ xs: 400, sm: 0 }}
          >
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                General Settings
              </Text>
              <Text as="p" variant="bodyMd">
                Configure the storefront UI settings to start and explore the Wishlist benefits for your store.
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <Grid alignItems="center" justifyContent="space-between">
              <Grid.Cell columnSpan={{ xs: 10, sm: 5, md: 5, lg: 10, xl: 10 }}>
                <Text variant="bodyMd">Variant Change Detection</Text>
                <Text variant="bodyMd">
                  Enable now to add products to the wishlist based on specific variants.
                </Text>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 2, sm: 1, md: 1, lg: 2, xl: 2 }}>
                <Checkbox
                  name="variantDetection"
                  checked={config.options?.variantChange || false}
                  onChange={(newChecked) =>
                    handleChange(newChecked, "variantDetection")
                  }
                />
              </Grid.Cell>
            </Grid>
          </Card>
        </InlineGrid>
      </BlockStack>
    </BlockStack>
  );
}

// Other Settings Components
function ButtonSettings() {
  return <div>Button Settings</div>;
}

function NotificationSettings() {
  return <div>Notification Settings</div>;
}

function LanguageSettings() {
  return <div>Language Settings</div>;
}
