import fetch from "node-fetch";
import pino from "pino";
import { getCache, setCache } from "./cache";

const log = pino({ name: "vies" });

export interface VatValidationResult {
  valid: boolean;
  normalizedVat: string;
  name: string;
  address: string;
}

function normalizeVatNumber(vatNumberRaw: string): string {
  return vatNumberRaw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export async function validateVat(vatNumberRaw: string, countryCode: string): Promise<VatValidationResult> {
  const vatNumber = normalizeVatNumber(vatNumberRaw);
  const upperCountry = countryCode.toUpperCase();
  const cacheKey = `vies:${upperCountry}:${vatNumber}`;

  const cached = await getCache<VatValidationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>${upperCountry}</countryCode>
      <vatNumber>${vatNumber}</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(
    "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
    {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: soapEnvelope,
      timeout: 10_000
    }
  );

  if (!response.ok) {
    const text = await response.text();
    log.error({ status: response.status, text }, "VIES service error");
    throw new Error(`VIES service error: ${response.status}`);
  }

  const xml = await response.text();
  const valid = /<valid>true<\/valid>/i.test(xml);
  const name = (xml.match(/<name>([^<]*)<\/name>/i)?.[1] || "").trim();
  const address = (xml.match(/<address>([^<]*)<\/address>/i)?.[1] || "").trim();

  const result: VatValidationResult = {
    valid,
    normalizedVat: vatNumber,
    name,
    address
  };

  if (valid) {
    await setCache(cacheKey, result, 60 * 60 * 24);
  }

  return result;
}
