import type { Board, SavedState } from './types'

const DB_NAME = 'pinbu-studio'
const STORE = 'documents'
const KEY = 'workspace-v1'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveWorkspace(state: SavedState): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(state, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadWorkspace(): Promise<SavedState | null> {
  const db = await openDb()
  const value = await new Promise<SavedState | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return value ?? null
}

export function validateImportedProject(value: unknown): value is Board {
  if (!value || typeof value !== 'object') return false
  const board = value as Partial<Board>
  return board.version === 1 && typeof board.id === 'string' && typeof board.title === 'string' &&
    typeof board.width === 'number' && typeof board.height === 'number' && Array.isArray(board.items)
}
