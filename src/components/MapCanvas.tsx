import { TrackingMap } from './TrackingMap'
import type { MapCanvasProps } from './MapCanvas.types'

/**
 * Web uses the schematic projection because the native Mapbox SDK is not
 * available there. The "PREVIEW" caption makes it explicit that this is not a
 * live tile map; pickup still requires a confirmed address, landmark or pin.
 */
export function MapCanvas({ caption, ...props }: MapCanvasProps) {
  return <TrackingMap {...props} caption={caption ? `PREVIEW · ${caption}` : 'PREVIEW · coordinates only'} />
}

export type { MapCanvasProps, MapCoordinate, MapFocus, MapMarker } from './MapCanvas.types'
