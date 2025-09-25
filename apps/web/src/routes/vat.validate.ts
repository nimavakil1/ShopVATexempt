import type { Request, Response } from "express";
import { validateVat } from "../lib/vies";
import { isEuNonBelgium } from "../lib/eu";

export async function vatValidateRoute(req: Request, res: Response) {
  try {
    const { vatNumber, countryCode } = req.body as { vatNumber?: string; countryCode?: string };
    if (!vatNumber || !countryCode) {
      return res.status(400).json({ ok: false, error: "MISSING_PARAMETERS" });
    }

    const { valid, normalizedVat, name, address } = await validateVat(vatNumber, countryCode);
    const euOk = isEuNonBelgium(countryCode);

    res.json({
      ok: true,
      valid,
      euOk,
      normalizedVat,
      name,
      address
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: "VIES_UNAVAILABLE" });
  }
}
