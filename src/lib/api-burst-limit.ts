// Process-local burst protection resets on restart. Durable provider quotas
// separately enforce paid-operation ceilings across replicas and restarts.
// Trust Railway ingress's rightmost x-forwarded-for hop, not a supplied prefix.
const WINDOW_MS = 60000
const MAX_NETWORKS = 5000
type Bucket = { count: number; expires: number }
const buckets = new Map<string, Bucket>()
let globalBucket: Bucket = { count: 0, expires: 0 }

export function checkApiBurst(headers: Headers, method: string, now = Date.now()): number {
  if (now >= globalBucket.expires) {
    globalBucket = { count: 0, expires: now + WINDOW_MS }
    for (const [key, value] of buckets) if (now >= value.expires) buckets.delete(key)
  }
  if (++globalBucket.count > 2000) return Math.max(1, Math.ceil((globalBucket.expires - now) / 1000))
  const forwarded = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim().toLowerCase()
  const network = forwarded && forwarded.length <= 64 ? forwarded : 'unknown'
  const kind = ['GET', 'HEAD', 'OPTIONS'].includes(method) ? 'read' : 'write'
  const key = `${kind}:${network}`
  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.expires) {
    if (!bucket && buckets.size >= MAX_NETWORKS) return 60
    bucket = { count: 0, expires: now + WINDOW_MS }
    buckets.set(key, bucket)
  }
  return ++bucket.count > (kind === 'read' ? 120 : 30) ? Math.max(1, Math.ceil((bucket.expires - now) / 1000)) : 0
}
