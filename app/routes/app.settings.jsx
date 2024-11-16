import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Box, Button, Card, Form, InlineGrid, Page, Text, TextField } from "@shopify/polaris";
import { useState } from "react";

import db from '../db.server';

export async function loader() {
let settings = await db.settings.findFirst();

  return json(settings);
}


export async function action({ request }) {
  let settings = await request.formData();
  settings = Object.fromEntries(settings);
  return json(settings);
}

export default function Settings() {
  const settings = useLoaderData();
  const [formState, setFormState] = useState(settings);
  return (
    <Page>
      <ui-title-bar title="Settings" />

      <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
        <Box
          as="section"
          paddingInlineStart={{ xs: 400, sm: 0 }}
          paddingInlineEnd={{ xs: 400, sm: 0 }}
        >
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              settings
            </Text>
            <Text as="p" variant="bodyMd">
              update app settings and preferences
            </Text>
          </BlockStack>
        </Box>
        <Card roundedAbove="sm">
          <Form method="post">
            <BlockStack gap="400">
              <TextField label="APP name" name="name" value={formState?.name} onChange={(value) => setFormState({ ...formState, name: value })} />
              <TextField label="Description" name="description" value={formState?.description} onChange={(value) => setFormState({ ...formState, description: value })} />
              <Button submit={true}>Save</Button>
            </BlockStack>
          </Form>
        </Card>
      </InlineGrid>
    </Page>
  )
}