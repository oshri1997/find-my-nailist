type DocData = Record<string, unknown>
const docStore: Record<string, DocData> = {}
const whereQueries: Array<{ collection: string; field: string; op: string; value: unknown }> = []

function makeCollectionRef(name: string) {
  return {
    where: jest.fn().mockImplementation((field: string, op: string, value: unknown) => {
      whereQueries.push({ collection: name, field, op, value })
      return {
        get: jest.fn().mockImplementation(() => {
          const ids = value as string[]
          const docs = ids
            .filter((id) => docStore[`${name}/${id}`])
            .map((id) => ({ id, data: () => docStore[`${name}/${id}`] }))
          return Promise.resolve({ docs })
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) } as unknown as import('firebase-admin/firestore').Firestore

import { batchFetchByIds } from '@/lib/batch-fetch'

describe('batchFetchByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    whereQueries.length = 0
    for (const key of Object.keys(docStore)) delete docStore[key]
  })

  it('returns an empty object without querying when given no ids', async () => {
    const result = await batchFetchByIds(mockDb, 'users', [])
    expect(result).toEqual({})
    expect(whereQueries).toHaveLength(0)
  })

  it('resolves each id to its document data, keyed by id', async () => {
    docStore['users/u1'] = { displayName: 'Dana' }
    docStore['users/u2'] = { displayName: 'Sarah' }
    const result = await batchFetchByIds(mockDb, 'users', ['u1', 'u2'])
    expect(result).toEqual({ u1: { displayName: 'Dana' }, u2: { displayName: 'Sarah' } })
  })

  it('silently drops ids with no matching document', async () => {
    docStore['users/u1'] = { displayName: 'Dana' }
    const result = await batchFetchByIds(mockDb, 'users', ['u1', 'missing'])
    expect(result).toEqual({ u1: { displayName: 'Dana' } })
  })

  it('dedupes duplicate ids into a single query entry', async () => {
    docStore['users/u1'] = { displayName: 'Dana' }
    await batchFetchByIds(mockDb, 'users', ['u1', 'u1', 'u1'])
    expect(whereQueries).toHaveLength(1)
    expect(whereQueries[0].value).toEqual(['u1'])
  })

  it('chunks more than 30 ids into multiple parallel "in" queries', async () => {
    const ids = Array.from({ length: 65 }, (_, i) => `u${i}`)
    for (const id of ids) docStore[`users/${id}`] = { displayName: id }
    const result = await batchFetchByIds(mockDb, 'users', ids)
    expect(Object.keys(result)).toHaveLength(65)
    // 65 ids / 30-per-query limit == 3 chunks (30 + 30 + 5)
    expect(whereQueries).toHaveLength(3)
    expect(whereQueries.map((q) => (q.value as string[]).length)).toEqual([30, 30, 5])
  })
})
