import type { Boleta } from '@/types/boleta'
import type { Rifa } from '@/types/rifa'
import type { CuadriculaBoleta } from '@/components/BoletaCuadricula'

const DB_NAME = 'rifas-vendedor-offline-v1'
const DB_VERSION = 1
const STORE = 'kv'

export type OfflineSnapshot<T> = {
  savedAt: number
  data: T
}

export type CuadriculaOfflineData = {
  boletas: CuadriculaBoleta[]
  alcance: 'pool_libre' | 'inventario_vendedor' | 'todas'
  rifaNombre?: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Error abriendo IndexedDB'))
  })
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as T) ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(value, key)
  })
}

export function getVendorUserIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const user = JSON.parse(raw) as { id?: string; rol?: string }
    if (String(user.rol || '').toUpperCase() !== 'VENDEDOR') return null
    return user.id ? String(user.id) : null
  } catch {
    return null
  }
}

export function isNetworkUnavailableError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (err instanceof TypeError) return true
  if (err instanceof Error && /failed to fetch|network|load failed|fetch/i.test(err.message)) {
    return true
  }
  return false
}

const rifasKey = (userId: string) => `rifas:${userId}`
const boletasKey = (userId: string, rifaId: string) => `boletas:${userId}:${rifaId}`
const cuadriculaKey = (userId: string, rifaId: string) => `cuadricula:${userId}:${rifaId}`

export async function saveVendorRifasOffline(
  userId: string,
  rifas: Rifa[]
): Promise<void> {
  const snapshot: OfflineSnapshot<Rifa[]> = { savedAt: Date.now(), data: rifas }
  await idbSet(rifasKey(userId), snapshot)
}

export async function loadVendorRifasOffline(
  userId: string
): Promise<OfflineSnapshot<Rifa[]> | null> {
  return idbGet<OfflineSnapshot<Rifa[]>>(rifasKey(userId))
}

export async function saveVendorBoletasOffline(
  userId: string,
  rifaId: string,
  boletas: Boleta[]
): Promise<void> {
  const snapshot: OfflineSnapshot<Boleta[]> = { savedAt: Date.now(), data: boletas }
  await idbSet(boletasKey(userId, rifaId), snapshot)
}

export async function loadVendorBoletasOffline(
  userId: string,
  rifaId: string
): Promise<OfflineSnapshot<Boleta[]> | null> {
  return idbGet<OfflineSnapshot<Boleta[]>>(boletasKey(userId, rifaId))
}

export async function saveVendorCuadriculaOffline(
  userId: string,
  rifaId: string,
  payload: CuadriculaOfflineData
): Promise<void> {
  const snapshot: OfflineSnapshot<CuadriculaOfflineData> = {
    savedAt: Date.now(),
    data: payload,
  }
  await idbSet(cuadriculaKey(userId, rifaId), snapshot)
}

export async function loadVendorCuadriculaOffline(
  userId: string,
  rifaId: string
): Promise<OfflineSnapshot<CuadriculaOfflineData> | null> {
  return idbGet<OfflineSnapshot<CuadriculaOfflineData>>(cuadriculaKey(userId, rifaId))
}

export function formatOfflineSavedAt(savedAt: number): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(savedAt))
  } catch {
    return new Date(savedAt).toLocaleString()
  }
}