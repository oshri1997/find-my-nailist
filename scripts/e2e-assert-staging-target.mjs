const baseUrl = process.env.PLAYWRIGHT_BASE_URL
const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID

if (baseUrl !== 'https://dev.nailistiot.fun') {
  throw new Error(`E2E must run against https://dev.nailistiot.fun, received: ${baseUrl || '(missing)'}`)
}

if (!adminProjectId) {
  throw new Error('FIREBASE_ADMIN_PROJECT_ID is required for staging E2E')
}

const response = await fetch(`${baseUrl}/api/firebase-config`)
if (!response.ok) {
  throw new Error(`Unable to read Firebase configuration from staging (${response.status})`)
}

const { projectId } = await response.json()
if (!projectId) {
  throw new Error('Staging did not return a Firebase project ID')
}

if (projectId !== adminProjectId) {
  throw new Error(
    `Firebase project mismatch: dev.nailistiot.fun serves "${projectId}", but the E2E Admin credential targets "${adminProjectId}"`,
  )
}

console.log(`[e2e-target] staging confirmed: ${baseUrl} → Firebase project ${projectId}`)
