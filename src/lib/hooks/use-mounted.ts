import { useEffect, useState } from 'react'

/** Évite les mismatches SSR/client quand le rendu dépend du token ou du navigateur. */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
