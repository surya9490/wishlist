
import { authenticate } from "../shopify.server";
import { createMetafield, getAppInstallationId, getMetafield } from "../services/settings";
import { json } from "@remix-run/node";



export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const appId = await getAppInstallationId(admin);
  const isMetafieldCreated = await getMetafield(admin, appId);
  const reponse = await createMetafield(admin, appId);

  return json({ isMetafieldCreated });

}