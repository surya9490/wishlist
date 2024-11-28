
import { authenticate } from "../shopify.server";
import { createMetafield, getAppInstallationId, getMetaFieldData } from "../services/settings";
import { json } from "@remix-run/node";
import { defaultConfig } from "../config/settings";



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