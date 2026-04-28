"use client";

import { type ReactNode, useEffect } from "react";

import { api } from "@/lib/trpc/react";

interface TenantThemeProviderProps {
  children: ReactNode;
  tenantSlug?: string;
}

interface BrandingColors {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  primaryText?: string;
  secondaryText?: string;
}

interface BrandingConfig {
  branding?: {
    colors?: BrandingColors;
  };
}

function applyColors(colors: BrandingColors) {
  const root = document.documentElement;
  if (colors.primary) root.style.setProperty("--tenant-primary", colors.primary);
  if (colors.secondary) root.style.setProperty("--tenant-secondary", colors.secondary);
  if (colors.background) root.style.setProperty("--tenant-background", colors.background);
  if (colors.text) root.style.setProperty("--tenant-text", colors.text);
  if (colors.primaryText) root.style.setProperty("--tenant-primary-text", colors.primaryText);
  if (colors.secondaryText) root.style.setProperty("--tenant-secondary-text", colors.secondaryText);
}

function resetColors() {
  const root = document.documentElement;
  root.style.removeProperty("--tenant-primary");
  root.style.removeProperty("--tenant-secondary");
  root.style.removeProperty("--tenant-background");
  root.style.removeProperty("--tenant-text");
  root.style.removeProperty("--tenant-primary-text");
  root.style.removeProperty("--tenant-secondary-text");
}

export function TenantThemeProvider({ children, tenantSlug }: TenantThemeProviderProps) {
  const { data: tenant } = api.tenant.bySlug.useQuery(
    { slug: tenantSlug || "" },
    { enabled: !!tenantSlug },
  );

  useEffect(() => {
    if (tenant) {
      const config = (tenant as unknown as Record<string, unknown>).config;
      const cfg = (config ?? null) as BrandingConfig | null;
      if (cfg?.branding?.colors) {
        applyColors(cfg.branding.colors);
      } else {
        resetColors();
      }
    }
    return () => resetColors();
  }, [tenant]);

  return <>{children}</>;
}

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const { data: tenants } = api.tenant.list.useQuery();
  const currentTenant = tenants?.[0];

  useEffect(() => {
    if (currentTenant) {
      const config = (currentTenant as unknown as Record<string, unknown>).config;
      const cfg = (config ?? null) as BrandingConfig | null;
      if (cfg?.branding?.colors) {
        applyColors(cfg.branding.colors);
      } else {
        resetColors();
      }
    }
    return () => resetColors();
  }, [currentTenant]);

  return <>{children}</>;
}
