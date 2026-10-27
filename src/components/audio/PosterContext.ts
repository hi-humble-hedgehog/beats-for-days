"use client";

import { createContext, useContext } from "react";
import type { Geometry } from "@/lib/grid/poster-geometry";

export type PosterContextValue = {
  geometry: Geometry;
  number: string;
  returnHref: string;
};

export const PosterContext = createContext<PosterContextValue | null>(null);

/**
 * Accesses poster player geometry and formatted track number.
 * Allows child route components (such as track number or info cards) to
 * adapt to the active poster dimensions.
 */
export function usePosterContext(): PosterContextValue | null {
  return useContext(PosterContext);
}
