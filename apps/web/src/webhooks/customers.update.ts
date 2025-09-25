import type { Request, Response } from "express";
import { isEuNonBelgium } from "../lib/eu";
import { adminGraphql, MUT_CUSTOMER_TAXEXEMPT, ShopifySession } from "../lib/shopify";

interface AuthedRequest extends Request {
  shopifySession?: ShopifySession;
}

type CustomerWebhookPayload = {
  id: number;
  default_address?: {
    country_code?: string;
  } | null;
};

export async function customersUpdateWebhook(req: AuthedRequest, res: Response) {
  const session = req.shopifySession;
  if (!session) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }

  const payload = req.body as CustomerWebhookPayload;
  const countryCode = payload.default_address?.country_code ?? null;
  const customerId = `gid://shopify/Customer/${payload.id}`;

  try {
    if (isEuNonBelgium(countryCode)) {
      await adminGraphql(session, MUT_CUSTOMER_TAXEXEMPT, {
        id: customerId,
        taxExempt: true
      });
      return res.json({ ok: true, action: "KEPT_TAX_EXEMPT" });
    }

    await adminGraphql(session, MUT_CUSTOMER_TAXEXEMPT, {
      id: customerId,
      taxExempt: false
    });
    res.json({ ok: true, action: "REVOKED" });
  } catch (error) {
    res.status(500).json({ ok: false, error: "SHOPIFY_ERROR" });
  }
}
