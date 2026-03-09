/**
 * IndexedDB image store for ingredient images.
 *
 * Completely separate from the product image store (lib/image-store.ts).
 * Uses a different database name so there is zero risk of collision.
 *
 * DB:    nexpos_ingredient_images
 * Store: ingredient_images
 * Keys:  ingredient id  (e.g. "ing_1710000000000")
 * Value: base64 JPEG data URL
 *
 * All operations fail silently so the app keeps working even when
 * IndexedDB is unavailable (e.g. private browsing in some browsers).
 */

const DB_NAME    = 'nexpos_ingredient_images'
const STORE_NAME = 'ingredient_images'
const DB_VERSION = 1

// Cache the open DB connection so we only call indexedDB.open() once.
let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror   = () => reject(req.error)
  })
}

/** Save a base64 data URL keyed by ingredient ID. */
export async function saveIngredientImage(id: string, dataUrl: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(dataUrl, id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

/** Load all stored images as a { ingredientId → dataUrl } map. */
export async function loadAllIngredientImages(): Promise<Record<string, string>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx     = db.transaction(STORE_NAME, 'readonly')
    const store  = tx.objectStore(STORE_NAME)
    const result: Record<string, string> = {}
    const cursor = store.openCursor()
    cursor.onsuccess = () => {
      const c = cursor.result
      if (c) {
        result[c.key as string] = c.value as string
        c.continue()
      } else {
        resolve(result)
      }
    }
    cursor.onerror = () => reject(cursor.error)
  })
}

/** Delete the image for an ingredient that had its image removed. */
export async function deleteIngredientImage(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}
