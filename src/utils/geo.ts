export interface BearingPoint {
  latitude: number | null
  longitude: number | null
}

/**
 * Initial bearing from one coordinate to the next, in degrees clockwise from
 * true north. Derived only from coordinates the backend already supplied, so
 * it is used purely to orient the map — never as a claimed GPS heading.
 */
export function bearingDeg(from: BearingPoint, to: BearingPoint): number | null {
  if (
    from.latitude == null ||
    from.longitude == null ||
    to.latitude == null ||
    to.longitude == null
  ) {
    return null
  }

  const lat1 = (from.latitude * Math.PI) / 180
  const lat2 = (to.latitude * Math.PI) / 180
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180

  const y = Math.sin(deltaLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)

  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return null
  return (Math.atan2(y, x) * 180) / Math.PI
}
