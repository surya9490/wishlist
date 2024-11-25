import prisma from "../db.server";

// Fetch access token from the database
const getAccessToken = async (shop) => {
  const accessTokenRecord = await prisma.session.findFirst({ where: { shop } });
  if (!accessTokenRecord || !accessTokenRecord.accessToken) {
    throw new Error("Access token not found for the shop.");
  }
  return accessTokenRecord.accessToken;
};

export default getAccessToken