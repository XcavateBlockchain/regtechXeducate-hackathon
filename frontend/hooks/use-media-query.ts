import { useSyncExternalStore } from "react";

/*
 * Subscribes to matchMedia; uses useSyncExternalStore so SSR + the first
 * hydrated client render stay aligned (via getServerSnapshot), then the
 * real viewport is read without waiting for useEffect.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
