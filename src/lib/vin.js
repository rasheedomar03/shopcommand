const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i

export function isValidVin(vin) {
  return VIN_RE.test(vin)
}

/**
 * Decode a VIN using the free NHTSA vPIC API.
 * Returns { year, make, model, trim, bodyType, engineSize, fuelType } or null.
 */
export async function decodeVin(vin) {
  if (!isValidVin(vin)) return null

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    )
    if (!res.ok) return null

    const data = await res.json()
    const r = data.Results?.[0]
    if (!r || r.ErrorCode !== '0') return null

    return {
      year: r.ModelYear ? Number(r.ModelYear) : null,
      make: r.Make || null,
      model: r.Model || null,
      trim: r.Trim || null,
      bodyType: r.BodyClass || null,
      engineSize: r.DisplacementL ? `${r.DisplacementL}L` : null,
      fuelType: r.FuelTypePrimary || null,
    }
  } catch {
    return null
  }
}
