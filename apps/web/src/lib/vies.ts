import fetch from "node-fetch";
import pino from "pino";
import { getCache, setCache } from "./cache.js";

const log = pino({ name: "vies" });

export type VatValidationResult = {
  valid: boolean;
  normalizedVat: string;
  name: string;
  address: string;
}

function normalizeVatNumber(vatNumberRaw: string, countryCodeRaw: string): { vat: string; country: string } {
  const cleaned = vatNumberRaw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  // VIES expects GR as EL
  const inputCountry = countryCodeRaw.toUpperCase();
  const viesCountry = inputCountry === "GR" ? "EL" : inputCountry;

  // If the VAT number starts with the country code, strip it
  let vat = cleaned;
  if (vat.startsWith(viesCountry)) {
    vat = vat.slice(viesCountry.length);
  }

  return { vat, country: viesCountry };
}

export async function validateVat(vatNumberRaw: string, countryCode: string): Promise<VatValidationResult> {
  const { vat, country } = normalizeVatNumber(vatNumberRaw, countryCode);
  const cacheKey = `vies:${country}:${vat}`;

  const cached = await getCache<VatValidationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>${country}</countryCode>
      <vatNumber>${vat}</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(
    "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
    {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: soapEnvelope,
      
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
    normalizedVat: vat,
    name,
    address
  };

  if (valid) {
    await setCache(cacheKey, result, 60 * 60 * 24);
  }

  return result;
}
