// apps/web/src/__tests__/resources.test.ts
import { describe, it, expect } from "vitest";
import {
  findFreeResource,
  getAllFreeResources,
  getAllPremiumResources,
} from "@/lib/resources";

const VALID_TYPES = [
  "guide",
  "checklist",
  "cheatsheet",
  "sample",
  "letter",
  "timeline",
  "comparison",
] as const;

describe("findFreeResource", () => {
  it("returns the resource when the id exists", () => {
    const resource = findFreeResource("ee-document-checklist");
    expect(resource).toBeDefined();
    expect(resource?.id).toBe("ee-document-checklist");
    expect(resource?.fileName).toBe("ee-document-checklist.pdf");
  });

  it("returns undefined for an id that does not exist", () => {
    expect(findFreeResource("this-does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(findFreeResource("")).toBeUndefined();
  });
});

describe("getAllFreeResources", () => {
  it("returns a non-empty array", () => {
    expect(getAllFreeResources().length).toBeGreaterThan(0);
  });

  it("every free resource has all required fields", () => {
    for (const r of getAllFreeResources()) {
      expect(r.id, `${r.id}: missing id`).toBeTruthy();
      expect(r.title, `${r.id}: missing title`).toBeTruthy();
      expect(r.fileName, `${r.id}: missing fileName`).toBeTruthy();
      expect(r.description, `${r.id}: missing description`).toBeTruthy();
      expect(
        (VALID_TYPES as readonly string[]).includes(r.type),
        `${r.id}: invalid type "${r.type}"`,
      ).toBe(true);
      expect(typeof r.featured, `${r.id}: featured must be boolean`).toBe(
        "boolean",
      );
    }
  });

  it("all ids are unique", () => {
    const resources = getAllFreeResources();
    const ids = resources.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("featured resources appear before non-featured", () => {
    const resources = getAllFreeResources();
    const firstNonFeaturedIdx = resources.findIndex((r) => !r.featured);
    if (firstNonFeaturedIdx === -1) return; // all featured — pass
    const afterNonFeatured = resources.slice(firstNonFeaturedIdx);
    expect(afterNonFeatured.every((r) => !r.featured)).toBe(true);
  });
});

describe("getAllPremiumResources", () => {
  it("returns a non-empty array", () => {
    expect(getAllPremiumResources().length).toBeGreaterThan(0);
  });

  it("every premium resource has valid pricing", () => {
    for (const r of getAllPremiumResources()) {
      expect(r.id, `${r.id}: missing id`).toBeTruthy();
      expect(r.title, `${r.id}: missing title`).toBeTruthy();
      expect(r.priceINR, `${r.id}: priceINR must be positive`).toBeGreaterThan(
        0,
      );
      expect(
        (VALID_TYPES as readonly string[]).includes(r.type),
        `${r.id}: invalid type "${r.type}"`,
      ).toBe(true);
    }
  });

  it("all ids are unique", () => {
    const resources = getAllPremiumResources();
    const ids = resources.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
