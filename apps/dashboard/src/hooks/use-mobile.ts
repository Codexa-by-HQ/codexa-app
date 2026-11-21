import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

function subscribe(onChange: () => void) {
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/**
 * True below the mobile breakpoint. It subscribes to the media query rather
 * than setting state in an effect, so the first render is already correct.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => query.matches)
}
