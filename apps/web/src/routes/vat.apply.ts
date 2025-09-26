import type { Request, Response } from "express";
import { adminGraphql, MUT_CUSTOMER_TAXEXEMPT, MUT_SET_METAFIELDS, ShopifySession } from "../lib/shopify.js";
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
  const session = req.shopifySession;
  if (!session) {
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

    const now = new Date().toISOString();
    await adminGraphql(session, MUT_SET_METAFIELDS, {
      ownerId: customerId,
      metafields: [
        {
          namespace: "b2b",
          key: "vat_number",
          type: "single_line_text_field",
          value: vatNumber
        },
        {
          namespace: "b2b",
          key: "vat_country",
          type: "single_line_text_field",
          value: countryCode
        },
        {
          namespace: "b2b",
          key: "vat_valid",
          type: "boolean",
          value: "true"
        },
        {
          namespace: "b2b",
          key: "vat_last_checked_at",
          type: "date_time",
          value: now
        }
      ]
    });

    res.json({ ok: true, taxExempt: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "SHOPIFY_ERROR" });
  }
}
