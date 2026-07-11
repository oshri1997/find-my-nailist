// Shared by the upload UI (client-side check, so most uploads never even hit
// the server) and POST /api/portfolio (the authoritative, unbypassable check)
// — a single source keeps the two from ever drifting apart.
export const MAX_PORTFOLIO_PHOTOS = 20
