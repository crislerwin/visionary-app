"use client";

import type { TenantSocialConfig } from "@/lib/tenant-social";
import { whatsappUrl } from "@/lib/whatsapp";
import { FaGoogle, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";

interface MenuSocialBarProps {
  social?: TenantSocialConfig;
  primaryColor?: string;
}

function cleanInstagram(value: string): string {
  const handle = value.startsWith("@") ? value.slice(1) : value;
  if (handle.startsWith("http")) {
    try {
      const url = new URL(handle);
      return url.pathname.replace(/^\//, "");
    } catch {
      return handle;
    }
  }
  return handle;
}

function instagramUrl(handle: string): string {
  return `https://instagram.com/${cleanInstagram(handle)}`;
}

const ICON_SIZE = 16;
const SMALL_ICON_SIZE = 14;

const WHATSAPP_GREEN = "#25D366";

export function MenuSocialBar({ social, primaryColor }: MenuSocialBarProps) {
  if (!social) return null;

  const accent = primaryColor ?? "var(--primary)";

  // Ícones sociais: Instagram + Google Maps
  const socialIcons: { icon: React.ReactNode; href: string; label: string }[] = [];

  if (social.instagram) {
    socialIcons.push({
      icon: (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(45deg, #FAE318, #E03180, #5D2FDE)" }}
        >
          <FaInstagram size={SMALL_ICON_SIZE} color="white" />
        </div>
      ),
      href: instagramUrl(social.instagram),
      label: "Instagram",
    });
  }

  if (social.googleMapsUrl) {
    socialIcons.push({
      icon: <FaGoogle size={ICON_SIZE} color="#EA4335" />,
      href: social.googleMapsUrl,
      label: "Google",
    });
  }

  // Canais de pedido: WhatsApp + Pedir online
  const orderActions: {
    icon: React.ReactNode;
    href: string;
    label: string;
    color: string;
  }[] = [];

  if (social.whatsapp) {
    orderActions.push({
      icon: <FaWhatsapp size={ICON_SIZE} />,
      href: whatsappUrl(social.whatsapp) ?? "#",
      label: "WhatsApp",
      color: WHATSAPP_GREEN,
    });
  }

  if (social.externalOrderUrl) {
    orderActions.push({
      icon: <FiExternalLink size={ICON_SIZE} />,
      href: social.externalOrderUrl,
      label: "Pedir online",
      color: accent,
    });
  }

  if (socialIcons.length === 0 && orderActions.length === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-2">
      <div className="flex items-center justify-between">
        {/* Esquerda: redes sociais pequenas */}
        <div className="flex items-center gap-2">
          {socialIcons.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full ring-1 ring-border/30 hover:ring-border/60 transition-all"
            >
              {item.icon}
            </a>
          ))}
        </div>

        {/* Direita: ações de pedido lado a lado */}
        <div className="flex items-center gap-2">
          {orderActions.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: item.color }}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
