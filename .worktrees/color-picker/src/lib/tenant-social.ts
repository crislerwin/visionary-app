/**
 * Social & contact settings stored inside Tenant.config JSONB.
 * All fields are optional — the menu gracefully degrades when absent.
 */
export interface TenantSocialConfig {
  /** Instagram handle or full URL */
  instagram?: string;
  /** Google Maps / Reviews URL */
  googleMapsUrl?: string;
  /** Fixed star rating (1-5), e.g. 4.7 */
  googleStars?: number;
  /** WhatsApp number with country code, e.g. "5511999999999" */
  whatsapp?: string;
  /** Estimated delivery time text, e.g. "30–45 min" */
  deliveryTime?: string;
  /** Physical address or short location text */
  address?: string;
  /** External ordering link (iFood, etc.) */
  externalOrderUrl?: string;
}

/** Extract typed social config from raw tenant config object, with tenant-column fallbacks. */
export function getSocialConfig(
  config: unknown,
  tenant?: { whatsappPhone?: string | null },
): TenantSocialConfig {
  const cfg = config as Record<string, unknown> | null;
  const social = (cfg?.social as Record<string, unknown>) ?? {};
  return {
    instagram: social.instagram ? String(social.instagram) : undefined,
    googleMapsUrl: social.googleMapsUrl ? String(social.googleMapsUrl) : undefined,
    googleStars: typeof social.googleStars === "number" ? social.googleStars : undefined,
    whatsapp:
      (social.whatsapp ? String(social.whatsapp) : undefined) ?? tenant?.whatsappPhone ?? undefined,
    deliveryTime: social.deliveryTime ? String(social.deliveryTime) : undefined,
    address: social.address ? String(social.address) : undefined,
    externalOrderUrl: social.externalOrderUrl ? String(social.externalOrderUrl) : undefined,
  };
}
