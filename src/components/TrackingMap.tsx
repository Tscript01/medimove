import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../theme'
import { AppText } from './ui'

/**
 * A lightweight, dependency-free map used until a Mapbox token / development
 * build is configured. It projects real lat/lng values onto a schematic canvas,
 * so the route, ambulance and destination stay in the correct relative
 * positions. Renders identically in Expo Go, on device and on web.
 */
export interface MapMarker {
  id: string
  latitude: number
  longitude: number
  kind: 'user' | 'ambulance' | 'hospital'
  label?: string
}

export interface TrackingMapProps {
  markers: MapMarker[]
  /** Ordered GPS trail; drawn as a polyline. */
  route?: { latitude: number; longitude: number }[]
  height?: number
  /** Small overlay caption, e.g. "Live · updated 12s ago". */
  caption?: string
}

const PAD = 34
const MIN_SPAN = 0.01 // degrees — prevents divide-by-zero for a single point

interface Point {
  x: number
  y: number
}

export function TrackingMap({ markers, route = [], height = 200, caption }: TrackingMapProps) {
  const t = useAppTheme()
  const [size, setSize] = useState({ width: 0, height: 0 })

  const bounds = useMemo(() => {
    const all = [
      ...markers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
      ...route,
    ]
    if (all.length === 0) return null
    const lats = all.map((p) => p.latitude)
    const lngs = all.map((p) => p.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    return {
      minLat: minLat - MIN_SPAN,
      maxLat: maxLat + MIN_SPAN,
      minLng: minLng - MIN_SPAN,
      maxLng: maxLng + MIN_SPAN,
    }
  }, [markers, route])

  const project = (latitude: number, longitude: number): Point | null => {
    if (!bounds || size.width === 0 || size.height === 0) return null
    const spanLat = bounds.maxLat - bounds.minLat
    const spanLng = bounds.maxLng - bounds.minLng
    return {
      x: PAD + ((longitude - bounds.minLng) / spanLng) * (size.width - PAD * 2),
      y: PAD + ((bounds.maxLat - latitude) / spanLat) * (size.height - PAD * 2),
    }
  }

  const routePoints = route.map((p) => project(p.latitude, p.longitude)).filter((p): p is Point => p != null)
  const segments: { p1: Point; p2: Point; length: number; angle: number }[] = []
  for (let i = 1; i < routePoints.length; i += 1) {
    const p1 = routePoints[i - 1]
    const p2 = routePoints[i]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    segments.push({
      p1,
      p2,
      length: Math.max(2, Math.hypot(dx, dy)),
      angle: Math.atan2(dy, dx),
    })
  }

  return (
    <View
      style={[
        styles.canvas,
        { height, backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.lg, borderColor: t.colors.border },
      ]}
      onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
    >
      {/* Faint grid gives the schematic a "map" feel without a tile provider. */}
      <View style={styles.grid} pointerEvents="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <View key={`h${f}`} style={[styles.gridLine, { top: `${f * 100}%`, backgroundColor: t.colors.border }]} />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <View key={`v${f}`} style={[styles.gridLineV, { left: `${f * 100}%`, backgroundColor: t.colors.border }]} />
        ))}
      </View>

      {/* GPS trail */}
      {segments.map((seg, index) => (
        <View
          key={`seg-${index}`}
          style={{
            position: 'absolute',
            left: (seg.p1.x + seg.p2.x) / 2 - seg.length / 2,
            top: (seg.p1.y + seg.p2.y) / 2 - 2,
            width: seg.length,
            height: 4,
            borderRadius: 2,
            backgroundColor: t.colors.primary,
            opacity: 0.55,
            transform: [{ rotate: `${seg.angle}rad` }],
          }}
        />
      ))}
      {routePoints.map((p, index) => (
        <View
          key={`pt-${index}`}
          style={[
            styles.trailDot,
            { left: p.x - 3, top: p.y - 3, backgroundColor: t.colors.primary },
          ]}
        />
      ))}

      {/* Markers */}
      {markers.map((marker) => {
        const point = project(marker.latitude, marker.longitude)
        if (!point) return null
        const isUser = marker.kind === 'user'
        const isHospital = marker.kind === 'hospital'
        const color = isUser ? t.colors.text : isHospital ? t.colors.info : t.colors.emergency
        const size = isUser ? 14 : 30
        const icon: 'locate' | 'business' | 'medical' = isUser ? 'locate' : isHospital ? 'business' : 'medical'
        return (
          <View key={marker.id} style={[styles.markerWrap, { left: point.x, top: point.y }]}>
            <View
              style={[
                styles.marker,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: isUser ? color : t.colors.surface,
                  borderColor: color,
                  borderWidth: isUser ? 0 : 2,
                },
              ]}
            >
              {isUser ? null : <Ionicons name={icon} size={size * 0.5} color={color} />}
            </View>
            {marker.label ? (
              <View style={[styles.label, { backgroundColor: t.colors.bgElevated, borderRadius: t.radius.sm }]}>
                <AppText variant="micro" numberOfLines={1}>
                  {marker.label}
                </AppText>
              </View>
            ) : null}
          </View>
        )
      })}

      {caption ? (
        <View style={[styles.caption, { backgroundColor: t.colors.bgElevated, borderRadius: t.radius.pill }]}>
          <View style={[styles.captionDot, { backgroundColor: t.colors.success }]} />
          <AppText variant="micro" color="textMuted" numberOfLines={1}>
            {caption}
          </AppText>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  canvas: { width: '100%', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  grid: { ...StyleSheet.absoluteFill },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, opacity: 0.5 },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, opacity: 0.5 },
  trailDot: { position: 'absolute', borderRadius: 3 },
  markerWrap: { position: 'absolute', alignItems: 'center', transform: [{ translateX: -15 }, { translateY: -15 }] },
  marker: { alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, maxWidth: 120 },
  caption: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  captionDot: { width: 6, height: 6, borderRadius: 3 },
})
