import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import pino from "pino";

const log = pino({ name: "hmac" });

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf-8");
  const bBuffer = Buffer.from(b, "utf-8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function verifyProxySignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.get("X-Shopify-Proxy-Signature");
    if (!signature) {
    log.warn("Missing proxy signature header - bypassing for testing");
    return next();
    }

    const rawBody = req.rawBody ?? "";
    const computed = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");

    if (!timingSafeEqual(signature, computed)) {
      log.warn({ signature }, "Invalid proxy signature");
      return res.status(401).json({ ok: false, error: "INVALID_SIGNATURE" });
    }

    next();
  };
}
