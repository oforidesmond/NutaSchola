"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "./progress-store";

/**
 * Drop-in useRouter that starts the global navigation progress bar
 * on push/replace (programmatic navigations that click-capture misses).
 */
export function useAppRouter() {
  const router = useRouter();

  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        startNavigationProgress();
        return router.push(...args);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        startNavigationProgress();
        return router.replace(...args);
      },
    }),
    [router],
  );
}
