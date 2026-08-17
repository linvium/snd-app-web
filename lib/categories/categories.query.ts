export const categoryKeys = {
  all: ['categories'] as const,
  // Coordinates are rounded to one decimal (~11 km) so panning the map does
  // not invalidate the tree on every pixel (doc 02 §5.4 uses the same trick).
  tree: (lat: number | null, lng: number | null, radiusKm: number | null) =>
    [
      ...categoryKeys.all,
      'tree',
      lat === null ? null : Number(lat.toFixed(1)),
      lng === null ? null : Number(lng.toFixed(1)),
      radiusKm,
    ] as const,
}
