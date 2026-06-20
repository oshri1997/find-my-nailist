export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} מ׳`
  return `${km.toFixed(1)} ק"מ`
}
