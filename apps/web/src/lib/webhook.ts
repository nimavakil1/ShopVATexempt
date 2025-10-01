import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function verifyWebhookSignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.get("X-Shopify-Hmac-Sha256");
    if (!header) {
      return res.status(401).send("Missing HMAC header");
    }
    const rawBody = req.rawBody ?? "";
    const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    if (!timingSafeEqual(header, digest)) {
      return res.status(401).send("Invalid HMAC signature");
    }
    next();
  };
}
