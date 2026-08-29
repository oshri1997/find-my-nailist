export function filterNailists(
  nailists: Array<Record<string, unknown>>,
  service?: string,
  maxPrice?: number,
): Array<Record<string, unknown>> {
  const normalizedServices = service?.split('||').map((value) => value.trim().toLowerCase()).filter(Boolean) ?? []
  return nailists.filter((n) => {
    if (normalizedServices.length > 0) {
      const names = (n.serviceNames as string[] | undefined) ?? []
      if (!names.some((name) => normalizedServices.some((value) => name.toLowerCase().includes(value)))) return false
    }
    if (maxPrice != null && (typeof n.minPrice !== 'number' || n.minPrice > maxPrice)) return false
    return true
  })
}
