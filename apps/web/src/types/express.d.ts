import "express";

declare module "express-serve-static-core" {
  interface Request {
    rawBody?: string;
    shopifySession?: import("../lib/shopify").ShopifySession;
  }
}
