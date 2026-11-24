export interface MapCoordinate {
  latitude: number
  longitude: number
}

export type MapMarkerKind = 'user' | 'requester' | 'ambulance' | 'hospital'

export interface MapMarker extends MapCoordinate {
  id: string
  kind: MapMarkerKind
  label?: string
}

/** A backend-verified moving target that the native map should follow. */
export interface MapFocus extends MapCoordinate {
  /** Degrees clockwise from north. Null keeps the camera north-up. */
  headingDeg?: number | null
  /** Must only be true when the backend says the fix is live. */
  live?: boolean
}

export interface MapCanvasProps {
  markers: MapMarker[]
  /** Ordered GPS trail; drawn as a polyline. */
  route?: MapCoordinate[]
  height?: number
  /** Small overlay caption, e.g. "Last updated 12s ago". */
  caption?: string
  /** Called with the tapped coordinate so a pin can be moved. */
  onPick?: (coordinate: MapCoordinate) => void
  /** Enables the Uber-style follow camera and 3D view when `live` is true. */
  focus?: MapFocus | null
  accessibilityLabel?: string
}

/** True when the native map can render real tiles and accept pin drops. */
export const NATIVE_MAP_AVAILABLE =
  typeof process !== 'undefined' && Boolean(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN)
