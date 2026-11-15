const PREFIX = 'module-last:'

export function setModuleLastPath(moduleId: string, pathname: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${PREFIX}${moduleId}`, pathname)
  } catch {
    /* ignore */
  }
}

export function getModuleLastPath(moduleId: string, fallbackHref: string): string {
  if (typeof window === 'undefined') return fallbackHref
  try {
    return sessionStorage.getItem(`${PREFIX}${moduleId}`) || fallbackHref
  } catch {
    return fallbackHref
  }
}

export function clearModuleLastPaths() {
  if (typeof window === 'undefined') return
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}