import { geocodeAddress } from '../geocoding'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('geocodeAddress', () => {
  it('returns null when GOOGLE_MAPS_API_KEY is not set', async () => {
    const original = process.env.GOOGLE_MAPS_API_KEY
    delete process.env.GOOGLE_MAPS_API_KEY
    const result = await geocodeAddress('Tel Aviv')
    expect(result).toBeNull()
    process.env.GOOGLE_MAPS_API_KEY = original
  })

  it('returns coordinates and geohash on success', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        results: [{ geometry: { location: { lat: 32.08, lng: 34.78 } } }],
      }),
    })

    const result = await geocodeAddress('Tel Aviv')
    expect(result).not.toBeNull()
    expect(result!.lat).toBeCloseTo(32.08)
    expect(result!.lng).toBeCloseTo(34.78)
    expect(typeof result!.geohash).toBe('string')
    expect(result!.geohash.length).toBeGreaterThan(0)
  })

  it('returns null when Google API status is not OK', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    })

    const result = await geocodeAddress('nonexistent place xyz')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key'
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await geocodeAddress('Tel Aviv')
    expect(result).toBeNull()
  })

  it('calls the geocoding API with the encoded address and key', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'my-key'
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        results: [{ geometry: { location: { lat: 31.77, lng: 35.21 } } }],
      }),
    })

    await geocodeAddress('Jerusalem, Israel')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('Jerusalem%2C%20Israel')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('key=my-key')
    )
  })
})
