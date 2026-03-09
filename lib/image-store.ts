/**
 * IndexedDB image store for product images.
 *
 * localStorage has a ~5 MB quota — not nearly enough for multiple base64 product
 * images. IndexedDB is backed by disk and supports hundreds of megabytes, making
 * it the right place for binary blobs like compressed JPEG data URLs.
 *
 * Images are keyed by product ID. All operations fail silently so the app keeps
 * working even if IndexedDB is unavailable (e.g. private browsing in some browsers).
 */

const DB_NAME    = 'nexpos'
const STORE_NAME = 'product_images'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
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
    req.onsuccess = () => resolve(req.result)
    req.onerror  = () => reject(req.error)
  })
}

/** Save a base64 data URL keyed by product ID. */
export async function saveImage(productId: string, dataUrl: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(dataUrl, productId)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

/** Load all stored images as a { productId → dataUrl } map. */
export async function loadAllImages(): Promise<Record<string, string>> {
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

/** Delete the image for a product that has been removed. */
export async function deleteImage(productId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(productId)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}
