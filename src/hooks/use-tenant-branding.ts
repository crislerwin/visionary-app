"use client";

import { useEffect, useRef } from "react";

interface BrandingColors {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  primaryText?: string;
  secondaryText?: string;
}

interface CachedBranding {
  colors: BrandingColors;
  timestamp: number;
}

const CACHE_KEY_PREFIX = "tenant-branding";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

function getCacheKey(tenantSlug: string): string {
  return `${CACHE_KEY_PREFIX}:${tenantSlug}`;
}

export function getCachedBranding(tenantSlug: string): BrandingColors | null {
  try {
    const raw = localStorage.getItem(getCacheKey(tenantSlug));
    if (!raw) return null;
    const cached: CachedBranding = JSON.parse(raw);
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL_MS;
    if (isExpired) {
      localStorage.removeItem(getCacheKey(tenantSlug));
      return null;
    }
    return cached.colors;
  } catch {
    return null;
  }
}

export function setCachedBranding(tenantSlug: string, colors: BrandingColors): void {
  try {
    const payload: CachedBranding = { colors, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(tenantSlug), JSON.stringify(payload));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function clearBrandingCache(tenantSlug?: string): void {
  try {
    if (tenantSlug) {
      localStorage.removeItem(getCacheKey(tenantSlug));
    } else {
      // Clear all branding caches
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Silently fail
  }
}

const originalColors: Record<string, string | null> = {};

function saveOriginal(name: string) {
  if (!(name in originalColors)) {
    originalColors[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
}

function setVar(root: HTMLElement, name: string, value: string | undefined) {
  if (!value) return;
  saveOriginal(name);
  root.style.setProperty(name, value);
}

export function applyTenantColors(colors: BrandingColors) {
  const root = document.documentElement;

  if (colors.primary) {
    setVar(root, "--primary", colors.primary);
    setVar(root, "--ring", colors.primary);
    setVar(root, "--accent", colors.primary);
    setVar(root, "--sidebar-primary", colors.primary);
    setVar(root, "--sidebar-ring", colors.primary);
    setVar(root, "--chart-1", colors.primary);
  }
  if (colors.secondary) {
    setVar(root, "--secondary", colors.secondary);
    setVar(root, "--sidebar-accent", colors.secondary);
    setVar(root, "--chart-2", colors.secondary);
  }
  if (colors.background) {
    setVar(root, "--background", colors.background);
    setVar(root, "--card", colors.background);
    setVar(root, "--popover", colors.background);
    setVar(root, "--sidebar", colors.background);
  }
  if (colors.text) {
    setVar(root, "--foreground", colors.text);
    setVar(root, "--card-foreground", colors.text);
    setVar(root, "--popover-foreground", colors.text);
    setVar(root, "--muted-foreground", `${colors.text}80`);
    setVar(root, "--sidebar-foreground", colors.text);
    setVar(root, "--sidebar-border", `${colors.text}20`);
  }
  if (colors.primaryText) {
    setVar(root, "--primary-foreground", colors.primaryText);
    setVar(root, "--accent-foreground", colors.primaryText);
    setVar(root, "--sidebar-primary-foreground", colors.primaryText);
    setVar(root, "--sidebar-accent-foreground", colors.primaryText);
  }
  if (colors.secondaryText) {
    setVar(root, "--secondary-foreground", colors.secondaryText);
  }

  if (colors.background) {
    setVar(root, "--muted", `${colors.background}80`);
    if (colors.text) {
      setVar(root, "--border", `${colors.text}20`);
      setVar(root, "--input", `${colors.text}20`);
    }
  }
}

export function resetTenantColors() {
  const root = document.documentElement;
  const vars = [
    "--primary",
    "--secondary",
    "--background",
    "--foreground",
    "--primary-foreground",
    "--secondary-foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--border",
    "--input",
    "--ring",
    "--destructive",
    "--destructive-foreground",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
    "--chart-1",
    "--chart-2",
  ];

  for (const name of vars) {
    if (originalColors[name]) {
      root.style.setProperty(name, originalColors[name]);
    } else {
      root.style.removeProperty(name);
    }
  }
}

export function extractColors(config: unknown): BrandingColors {
  const cfg = config as Record<string, unknown> | null;
  const branding = (cfg?.branding as Record<string, unknown>) ?? {};
  const colors = (branding.colors as Record<string, string>) ?? {};
  return {
    primary: colors.primary || undefined,
    secondary: colors.secondary || undefined,
    background: colors.background || undefined,
    text: colors.text || undefined,
    primaryText: colors.primaryText || undefined,
    secondaryText: colors.secondaryText || undefined,
  };
}

export function useTenantBranding(config: unknown, tenantSlug?: string) {
  const didApplyCache = useRef(false);

  useEffect(() => {
    // Apply from cache once on mount to avoid flicker before server data arrives
    if (tenantSlug && !didApplyCache.current) {
      const cached = getCachedBranding(tenantSlug);
      if (cached) {
        applyTenantColors(cached);
      }
      didApplyCache.current = true;
    }

    const colors = extractColors(config);
    if (colors.primary || colors.secondary || colors.background || colors.text) {
      applyTenantColors(colors);
      if (tenantSlug) {
        setCachedBranding(tenantSlug, colors);
      }
    }
    // Intentionally NOT resetting colors on unmount to avoid flicker during SPA navigation
  }, [config, tenantSlug]);
}
