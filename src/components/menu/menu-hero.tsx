"use client";

import { Clock, MapPin, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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
}

export function MenuHero({ tenant, colors }: MenuHeroProps) {
  const [imgError, setImgError] = useState(false);
  const hasImage = tenant.image && !imgError;

  return (
    <section className="relative h-[42vh] min-h-[320px] w-full overflow-hidden">
      {hasImage ? (
        <Image
          src={tenant.image!}
          alt={tenant.name}
          fill
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgError(true)}
          unoptimized
          priority
        />
      ) : (
        <div
          className="absolute inset-0 h-full w-full"
          style={{ background: colors?.primary ?? "var(--primary)" }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-background" />
      <div className="relative z-10 mx-auto max-w-5xl h-full px-6 flex flex-col justify-end pb-10">
        <div className="flex items-center gap-2 text-white/90 text-xs font-medium mb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 text-white px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Aberto agora
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-3 py-1">
            <Clock className="h-3 w-3" /> 30–45 min
          </span>
        </div>
        <h1
          className="text-4xl md:text-6xl font-bold text-white leading-[1.05]"
          style={{ fontFamily: "var(--font-fraunces), serif" }}
        >
          {tenant.name}
        </h1>
        {tenant.description && <p className="mt-2 text-white/80 max-w-xl">{tenant.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/85">
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.9
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> Pedido online
          </span>
        </div>
      </div>
    </section>
  );
}
