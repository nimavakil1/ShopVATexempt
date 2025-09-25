export const EU_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
]);

export function isEuCountry(code: string | undefined | null): code is string {
  return Boolean(code && EU_COUNTRIES.has(code.toUpperCase()));
}

export function isEuNonBelgium(code: string | undefined | null): code is string {
  if (!code) return false;
  const normalized = code.toUpperCase();
  return normalized !== "BE" && EU_COUNTRIES.has(normalized);
}
