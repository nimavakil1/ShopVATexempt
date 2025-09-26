import type { Request, Response } from "express";
import { adminGraphql, MUT_CUSTOMER_TAXEXEMPT, MUT_SET_METAFIELDS, ShopifySession } from "../lib/shopify.js";

interface AuthedRequest extends Request {
  shopifySession?: ShopifySession;
}

type RevokeBody = {
  customerId?: string;
  reason?: string;
};

export async function vatRevokeRoute(req: AuthedRequest, res: Response) {
  const session = req.shopifySession;
  if (!session) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }

  const { customerId, reason } = (req.body ?? {}) as RevokeBody;
  if (!customerId) {
    return res.status(400).json({ ok: false, error: "MISSING_PARAMETERS" });
  }

  try {
    await adminGraphql(session, MUT_CUSTOMER_TAXEXEMPT, {
      id: customerId,
      taxExempt: false
    });

    await adminGraphql(session, MUT_SET_METAFIELDS, {
      ownerId: customerId,
      metafields: [
        {
          namespace: "b2b",
          key: "vat_valid",
          type: "boolean",
          value: "false"
        }
      ]
    });

    res.json({ ok: true, taxExempt: false, reason: reason ?? null });
  } catch (error) {
    res.status(500).json({ ok: false, error: "SHOPIFY_ERROR" });
  }
}
