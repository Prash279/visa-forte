// apps/web/src/lib/resources.ts
// Typed accessors for resources.json — used by the page, the download route,
// and tests. Centralises the type definitions so they are defined exactly once.

import data from "./resources.json";

export type ResourceType =
  | "guide"
  | "checklist"
  | "cheatsheet"
  | "sample"
  | "letter"
  | "timeline"
  | "comparison";

export interface FreeResource {
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
  fileName: string;
  featured: boolean;
}

export interface PremiumResource {
  id: string;
  title: string;
  type: ResourceType;
  category: string;
  description: string;
  priceINR: number;
  priceUSD: number;
  paddleProductId: string;
  featured: boolean;
}

// Returns the free resource matching id, or undefined if not found.
export function findFreeResource(id: string): FreeResource | undefined {
  return (data.free as FreeResource[]).find((r) => r.id === id);
}

// Returns all free resources, featured items first.
export function getAllFreeResources(): FreeResource[] {
  return [...(data.free as FreeResource[])].sort(
    (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
  );
}

// Returns all premium resources, featured items first.
export function getAllPremiumResources(): PremiumResource[] {
  return [...(data.premium as PremiumResource[])].sort(
    (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
  );
}
