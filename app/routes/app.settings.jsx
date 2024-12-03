
import { authenticate } from "../shopify.server";
import { createMetafield, getAppInstallationId, getMetaFieldData } from "../services/settings";
import { json } from "@remix-run/node";
import { defaultConfig, tabs } from "../config/settings";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { BlockStack, Box, Button, Card, Checkbox, Divider, Grid, InlineGrid, Page, Text, TextField } from "@shopify/polaris";
import {  useState } from "react";


export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const appId = await getAppInstallationId(admin);
  const metafieldData = await getMetaFieldData(admin, { namespace: "wishlist", key: "app_settings" });

  if (metafieldData !== null) {
    return json({ data: JSON.parse(metafieldData.node.value) })
  }
  const response = await createMetafield(admin, appId, defaultConfig);
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




export default function Settings() {
  const settingsData = useLoaderData();
  const [config, setConfig] = useState(settingsData.data || defaultConfig);

  const submit = useSubmit();

  // Handle Save Action
  const handleSave = () => {
    const formData = new FormData();
    formData.append("config", JSON.stringify(config));
    submit(formData, { method: "post" });
  };

  // Update Configuration
  const handleUpdateConfig = (updatedConfig) => {
    setConfig(updatedConfig);
  };

  const renderSettings = (settings) =>

    settings.map((setting) => {
      const currentValue = setting.target
        .split(".")
        .reduce((obj, key) => obj?.[key] ?? setting.default, config);

      const handleInputChange = (value) => {
        const updatedConfig = updateNestedConfig(config, setting.target, value);
        handleUpdateConfig(updatedConfig);
      };

      return (
        <Card roundedAbove="sm" key={setting.id}>
          <Grid alignItems="center" justifyContent="space-between">
            <Grid.Cell columnSpan={{ sm: 8 }}>
              <Text variant="bodyMd">{setting.label}</Text>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ sm: 4 }}>
              {setting.type === "checkbox" && (
                <Checkbox
                  name={setting.name}
                  checked={currentValue || false}
                  onChange={(checked) => handleInputChange(checked)}
                />
              )}
              {setting.type === "input" && (
                <TextField
                  name={setting.name}
                  value={currentValue || ""}
                  onChange={(value) => handleInputChange(value)}
                />
              )}
            </Grid.Cell>
          </Grid>
        </Card>
      );
    });

  return (
    <>
      <Button onClick={handleSave}>Save</Button>
      <Page style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BlockStack gap="200">
          {tabs.map((section) => (
            <BlockStack gap={{ xs: "200", sm: "200" }} key={section.id}>
              <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
                <Box
                  as="section"
                  paddingInlineStart={{ xs: 400, sm: 0 }}
                  paddingInlineEnd={{ xs: 400, sm: 0 }}
                >
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      {section.subHeading}
                    </Text>
                    {section.caption && (
                      <Text as="p" variant="bodyMd">
                        {section.caption}
                      </Text>
                    )}
                  </BlockStack>
                </Box>

                <BlockStack gap="400">
                  {renderSettings(section.settings)}
                </BlockStack>

              </InlineGrid>
              <Divider />

            </BlockStack>
          ))}
        </BlockStack>
      </Page>
    </>
  );
}





function updateNestedConfig(config, target, value) {
  debugger
  const keys = target.split(".");
  const updatedConfig = { ...config }; // Create a shallow copy
  let pointer = updatedConfig;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      pointer[key] = value; // Update the final key
    } else {
      pointer[key] = pointer[key] || {}; // Ensure intermediate keys exist
      pointer = pointer[key];
    }
  });

  return updatedConfig;
}
