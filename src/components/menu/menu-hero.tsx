"use client";

import { isOpenNow } from "@/lib/business-hours";
import type { TenantSocialConfig } from "@/lib/tenant-social";
import { Clock, MapPin, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { FaGoogle, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";

interface MenuHeroProps {
  tenant: {
    name: string;
    description: string | null;
    image: string | null;
  };
  colors?: {
    primary?: string;
    primaryText?: string;
  };
  social?: TenantSocialConfig;
  businessHours?: unknown;
  timezone?: string;
}

export function MenuHero({ tenant, colors, social, businessHours, timezone }: MenuHeroProps) {
  const [imgError, setImgError] = useState(false);
  const hasImage = tenant.image && !imgError;

  const deliveryTime = social?.deliveryTime ?? "30–45 min";
  const googleStars = social?.googleStars ?? 4.9;
  const addressLabel = social?.address ?? "Pedido online";
  const showStars = googleStars > 0;

  const primaryColor = colors?.primary ?? "var(--primary)";

  const open = isOpenNow(businessHours, timezone);
  const hasHours =
    !!businessHours && typeof businessHours === "object" && Object.keys(businessHours).length > 0;

  return (
    <section className="relative h-[42vh] min-h-[320px] w-full overflow-hidden">
      {hasImage ? (
        <Image
          src={tenant.image!}
          alt={tenant.name}
          fill
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgError(true)}
          unoptimized
          priority
          crossOrigin="anonymous"
        />
      ) : (
        <div className="absolute inset-0 h-full w-full" style={{ background: primaryColor }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-background" />
      <div className="relative z-10 mx-auto max-w-5xl h-full px-6 flex flex-col justify-end pb-10">
        <div className="flex items-center gap-2 text-white/90 text-xs font-medium mb-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
              !hasHours || open ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                !hasHours || open ? "bg-white" : "bg-white/80"
              }`}
            />
            {!hasHours || open ? "Aberto agora" : "Fechado"}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-3 py-1"
            style={{ color: primaryColor }}
          >
            <Clock className="h-3 w-3" style={{ color: primaryColor }} /> {deliveryTime}
          </span>
        </div>
        <h1
          className="text-4xl md:text-6xl font-bold text-white leading-[1.05]"
          style={{ fontFamily: "var(--font-fraunces), serif" }}
        >
          {tenant.name}
        </h1>
        {tenant.description && <p className="mt-2 text-white/80 max-w-xl">{tenant.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/85">
          {showStars && (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {googleStars.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
            {addressLabel}
          </span>
          {social?.instagram && (
            <a
              href={`https://instagram.com/${social.instagram.startsWith("@") ? social.instagram.slice(1) : social.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:opacity-80 transition-opacity"
              style={{ background: "linear-gradient(45deg, #FAE318, #E03180, #5D2FDE)" }}
            >
              <FaInstagram size={12} color="white" />
            </a>
          )}
          {social?.googleMapsUrl && (
            <a
              href={social.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Google Maps"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            >
              <FaGoogle size={12} color="#EA4335" />
            </a>
          )}
          {social?.whatsapp && (
            <a
              href={`https://wa.me/${social.whatsapp.replace(/\D/g, "").startsWith("55") ? social.whatsapp.replace(/\D/g, "") : `55${social.whatsapp.replace(/\D/g, "")}`}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#25D366" }}
            >
              <FaWhatsapp size={14} color="white" />
            </a>
          )}
          {social?.externalOrderUrl && (
            <a
              href={social.externalOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              <FiExternalLink size={14} />
              Pedir online
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
