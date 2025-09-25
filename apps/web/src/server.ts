import "dotenv/config";
import express from "express";
import pino from "pino";
import { verifyProxySignature } from "./lib/hmac";
import { verifyWebhookSignature } from "./lib/webhook";
import { vatValidateRoute } from "./routes/vat.validate";
import { vatApplyRoute } from "./routes/vat.apply";
import { vatRevokeRoute } from "./routes/vat.revoke";
import { customersUpdateWebhook } from "./webhooks/customers.update";

const log = pino({ name: "vat-app" });

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const apiSecret = process.env.SHOPIFY_API_SECRET || "";

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString("utf8");
    }
  })
);

app.use((req, _res, next) => {
  const headerShop = req.get("X-Shopify-Shop-Domain") ?? process.env.SHOP;
  const headerToken = req.get("X-Shopify-Access-Token") ?? process.env.SHOPIFY_ADMIN_TOKEN;
  if (headerShop && headerToken) {
    req.shopifySession = {
      shop: headerShop,
      accessToken: headerToken
    };
  }
  next();
});

const proxyRouter = express.Router();
if (apiSecret) {
  proxyRouter.use(verifyProxySignature(apiSecret));
}
proxyRouter.post("/validate", vatValidateRoute);
proxyRouter.post("/apply", vatApplyRoute);
proxyRouter.post("/revoke", vatRevokeRoute);
app.use("/vat", proxyRouter);

if (apiSecret) {
  app.post("/webhooks/customers/update", verifyWebhookSignature(apiSecret), customersUpdateWebhook);
} else {
  app.post("/webhooks/customers/update", customersUpdateWebhook);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error({ err }, "Unhandled error");
  res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
});

app.listen(port, () => {
  log.info(`VAT app listening on port ${port}`);
});
