import { describe, expect, it } from "vitest";
import {
  cn,
  formatDate,
  formatDateTime,
  getInitials,
  slugify,
  truncate,
} from "./utils";

describe("cn (className utility)", () => {
  it("should merge class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });
});

describe("formatDate", () => {
  it("should format date correctly", () => {
    const date = new Date("2024-01-15");
    expect(formatDate(date)).toMatch(/Jan|15|2024/);
  });

  it("should handle string dates", () => {
    expect(formatDate("2024-01-15")).toMatch(/Jan|15|2024/);
  });

  it("should return dash for null/undefined", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
  });
});

describe("formatDateTime", () => {
  it("should format date and time correctly", () => {
    const date = new Date("2024-01-15T14:30:00");
    const result = formatDateTime(date);
    expect(result).toMatch(/Jan|15|2024/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("should return dash for null/undefined", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
  });
});

describe("getInitials", () => {
  it("should return initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("should return first two letters from single name", () => {
    expect(getInitials("John")).toBe("JO");
  });

  it("should handle empty or null values", () => {
    expect(getInitials("")).toBe("??");
    expect(getInitials(null)).toBe("??");
    expect(getInitials(undefined)).toBe("??");
  });

  it("should handle names with multiple spaces", () => {
    expect(getInitials("John Jacob Jingleheimer")).toBe("JJ");
  });
});

describe("slugify", () => {
  it("should convert text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should handle special characters", () => {
    expect(slugify("Hello! @World#")).toBe("hello-world");
  });

  it("should handle multiple spaces", () => {
    expect(slugify("Hello   World")).toBe("hello-world");
  });

  it("should handle leading/trailing hyphens", () => {
    expect(slugify("-Hello World-")).toBe("hello-world");
  });
});

describe("truncate", () => {
  it("should truncate long strings", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
  });

  it("should not truncate short strings", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });

  it("should handle exact length", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });
});
