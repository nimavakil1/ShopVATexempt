import type { Request, Response } from "express";
  import { adminGraphql, MUT_CUSTOMER_TAXEXEMPT, ShopifySession } from "../lib/shopify.js";
  import { isEuNonBelgium } from "../lib/eu.js";

  type ApplyBody = {
    customerId?: string;
    vatNumber?: string;
    countryCode?: string;
    valid?: boolean;
  };

  interface AuthedRequest extends Request {
    shopifySession?: ShopifySession;
  }

  export async function vatApplyRoute(req: AuthedRequest, res: Response) {
    let session = req.shopifySession;

    // Fallback to environment variables if no session headers
    if (!session) {
      session = {
        shop: process.env.SHOP || "",
        accessToken: process.env.SHOPIFY_ADMIN_TOKEN || ""
      };
    }

    if (!session.shop || !session.accessToken) {
      return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    }

    const { customerId, vatNumber, countryCode, valid } = (req.body ?? {}) as ApplyBody;
    if (!customerId || !vatNumber || !countryCode || !valid) {
      return res.status(400).json({ ok: false, error: "MISSING_PARAMETERS" });
    }

    if (!isEuNonBelgium(countryCode)) {
      return res.status(400).json({ ok: false, error: "NOT_ELIGIBLE" });
    }

    try {
      await adminGraphql(session, MUT_CUSTOMER_TAXEXEMPT, {
        id: customerId,
        taxExempt: true
      });

      res.json({ ok: true, taxExempt: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: "SHOPIFY_ERROR" });
    }
  }

