export function toWhatsAppE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null; // telefone mínimo brasileiro = 10 dígitos (sem ddd é 8/9)
  if (digits.length >= 13 && digits.startsWith("55")) return digits; // já com código
  if (digits.length >= 11 && digits.startsWith("55")) return digits; // celular com ddd + 55
  return `55${digits}`; // adiciona código do país Brasil
}

export function whatsappUrl(rawPhone: string | null | undefined, message?: string): string | null {
  const e164 = toWhatsAppE164(rawPhone);
  if (!e164) return null;
  const base = `https://wa.me/${e164}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
