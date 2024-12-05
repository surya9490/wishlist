
import { authenticate } from "../shopify.server";
import { createMetafield, getAppInstallationId, getMetaFieldData } from "../services/settings";
import { json } from "@remix-run/node";
import { defaultConfig, tabs } from "../config/settings";
import { useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import { BlockStack, Box, Button, Card, Checkbox, Divider, FullscreenBar, Grid, InlineGrid, Page, Spinner, Text, TextField } from "@shopify/polaris";
import { useCallback, useState } from "react";


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
  const navigation = useNavigation()
  const navigate = useNavigate();

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

  const handleActionClick = useCallback(() => {
    navigate(-1)
  }, []);

  if (navigation.state === 'loading') {
    debugger
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner accessibilityLabel="Loading..." size="large" />
    </div>
    );
  }

  const renderSettings = (settings) =>

    settings.map((setting) => {
      const currentValue = setting.target
        .split(".")
        .reduce((obj, key) => obj?.[key] ?? setting.default, config);

      const handleInputChange = (value) => {
        const updatedConfig = updateNestedConfig(config, setting.target, value);
        debugger
        handleUpdateConfig(updatedConfig);
      };
      

      return (

        <Grid alignItems="center" justifyContent="space-between" key={setting.id} gap={{ xs: "0", sm: "0" }}>
          <Grid.Cell columnSpan={setting.input === "checkbox" ? { xs: 5 } : { xs: 6 }}>
            <Text variant="bodyMd">{setting.label}</Text>
          </Grid.Cell>
          <Grid.Cell columnSpan={setting.input === "checkbox" ? { xs: 1 } : { xs: 6 }}>
            {setting.input === "checkbox" && (
              <Checkbox
                name={setting.name}
                checked={currentValue || false}
                onChange={(checked) => handleInputChange(checked)}
              />
            )}
            {setting.input === "input" && (
              <TextField
                name={setting.name}
                value={currentValue || ""}
                type={setting.type}
                onChange={(value) => handleInputChange(value)}
              />
            )}
          </Grid.Cell>
        </Grid>
      );
    });

  return (
    <>
      <FullscreenBar onAction={handleActionClick}>
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <div style={{ marginLeft: '1rem', flexGrow: 1 }}>
            <Text variant="headingLg" as="p">
              Wishlist settings
            </Text>
          </div>
          <Button variant="primary" onClick={handleSave} loading={navigation.state === "submitting"}>
            Save
          </Button>
        </div>
      </FullscreenBar>

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
                <Card roundedAbove="sm" >
                  <BlockStack gap="400">
                    {renderSettings(section.settings)}
                  </BlockStack>
                </Card>
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
      // Update the final key
      pointer[key] = value;
    } else {
      // Ensure intermediate keys exist and are objects
      if (typeof pointer[key] !== "object" || pointer[key] === null) {
        pointer[key] = {}; // Reset to an empty object if it's not an object
      }
      pointer = pointer[key];
    }
  });

  return updatedConfig;
}
