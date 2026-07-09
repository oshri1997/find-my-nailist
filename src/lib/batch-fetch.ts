import type { Firestore } from 'firebase-admin/firestore'

// Firestore 'in' queries (including the '__name__' doc-id form) support at
// most 30 values per query — everything doc-id batch-fetch needs to chunk
// against.
const FIRESTORE_IN_QUERY_LIMIT = 30

// Batch-fetches documents by id, chunking into groups of 30 (Firestore's
// 'in' query limit) and running the chunks in parallel. Used anywhere a
// list of doc ids needs resolving to their data without an N+1 loop of
// individual .doc(id).get() calls.
export async function batchFetchByIds(
  db: Firestore,
  collection: string,
  ids: string[]
): Promise<Record<string, Record<string, unknown>>> {
  const uniqueIds = [...new Set(ids)]
  const result: Record<string, Record<string, unknown>> = {}
  if (uniqueIds.length === 0) return result

  const chunks: string[][] = []
  for (let i = 0; i < uniqueIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
    chunks.push(uniqueIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT))
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await db.collection(collection).where('__name__', 'in', chunk).get()
      snap.docs.forEach((d) => { result[d.id] = d.data() })
    })
  )

  return result
}
