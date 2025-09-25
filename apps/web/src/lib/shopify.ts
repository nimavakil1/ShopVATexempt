import fetch, { Response } from "node-fetch";
import pino from "pino";

type GraphqlVariables = Record<string, unknown> | undefined;

const log = pino({ name: "shopify" });

export interface ShopifySession {
  shop: string;
  accessToken: string;
}

async function handleErrors(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify GraphQL request failed: ${response.status} ${text}`);
  }
}

export async function adminGraphql<T = unknown>(
  session: ShopifySession,
  query: string,
  variables?: GraphqlVariables
): Promise<T> {
  const endpoint = `https://${session.shop}/admin/api/2024-04/graphql.json`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": session.accessToken
    },
    body: JSON.stringify({ query, variables })
  });

  await handleErrors(res);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    log.error({ errors: json.errors }, "Shopify GraphQL returned errors");
    throw new Error("Shopify GraphQL returned errors");
  }

  if (!json.data) {
    throw new Error("Shopify GraphQL response missing data");
  }
  return json.data;
}

export const MUT_CUSTOMER_TAXEXEMPT = /* GraphQL */ `
mutation SetTaxExempt($id: ID!, $taxExempt: Boolean!) {
  customerUpdate(input: { id: $id, taxExempt: $taxExempt }) {
    customer {
      id
      taxExempt
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const MUT_SET_METAFIELDS = /* GraphQL */ `
mutation SetMetafields($ownerId: ID!, $metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
      type
    }
    userErrors {
      field
      message
    }
  }
}
`;
