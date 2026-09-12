// Runs only against local Firebase emulators, never a deployed project.
const { readFileSync } = require('node:fs')
const { test, before, after } = require('node:test')
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing')
const { doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore')
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage')

let environment
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-abuse-protection',
    firestore: { host: '127.0.0.1', port: 8180, rules: readFileSync('firestore.rules', 'utf8') },
    storage: { host: '127.0.0.1', port: 9299, rules: readFileSync('storage.rules', 'utf8') },
  })
  await environment.withSecurityRulesDisabled(async context => {
    for (const name of ['users', 'clientProfiles', 'nailistProfiles', 'services', 'portfolioPhotos', 'workingHours', 'reviews', 'appointments', 'visitEvents', 'abuseLimits']) {
      await setDoc(doc(context.firestore(), name, 'alice'), { userId: 'alice' })
    }
    for (const name of ['avatars', 'covers', 'portfolio', 'feedback']) {
      await uploadBytes(ref(context.storage(), `${name}/alice/legacy.png`), new Uint8Array([137, 80, 78, 71]), { contentType: 'image/png' })
    }
  })
})
after(async () => { if (environment) await environment.cleanup() })

test('anonymous and signed-in SDK/REST clients cannot bypass limited database APIs', async () => {
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('alice')]) {
    const db = context.firestore()
    for (const name of ['users', 'clientProfiles', 'nailistProfiles', 'services', 'portfolioPhotos', 'workingHours', 'reviews', 'appointments', 'visitEvents', 'abuseLimits']) {
      await assertFails(getDoc(doc(db, name, 'alice')))
      await assertFails(getDocs(collection(db, name)))
      await assertFails(setDoc(doc(db, name, 'new'), { userId: 'alice' }))
    }
  }
})

test('all direct uploads, overwrites and deletes are denied, including the owner', async () => {
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('alice'), environment.authenticatedContext('attacker')]) {
    for (const name of ['avatars', 'covers', 'portfolio', 'feedback']) {
      for (const filename of ['legacy.png', 'new.png']) {
        await assertFails(uploadBytes(ref(context.storage(), `${name}/alice/${filename}`), new Uint8Array([1]), { contentType: 'image/png' }))
      }
      await assertFails(deleteObject(ref(context.storage(), `${name}/alice/legacy.png`)))
    }
  }
})

test('existing public images still load and feedback attachments remain private', async () => {
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('alice')]) {
    for (const name of ['avatars', 'covers', 'portfolio']) {
      await assertSucceeds(getBytes(ref(context.storage(), `${name}/alice/legacy.png`)))
    }
    await assertFails(getBytes(ref(context.storage(), 'feedback/alice/legacy.png')))
  }
})
