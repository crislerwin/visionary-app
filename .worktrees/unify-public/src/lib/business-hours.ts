/**
 * Business hours types and helper.
 */

export interface Shift {
  open: string; // HH:mm
  close: string; // HH:mm
}

export interface BusinessHours {
  monday?: Shift[];
  tuesday?: Shift[];
  wednesday?: Shift[];
  thursday?: Shift[];
  friday?: Shift[];
  saturday?: Shift[];
  sunday?: Shift[];
}

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const WEEKDAY_MAP: Record<number, DayKey> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns true if the business is currently open based on `businessHours`.
 * If no businessHours provided, returns `true` (fallback "always open").
 * Uses the browser's local timezone when `timezone` is omitted.
 */
export function isOpenNow(businessHours: unknown, timezone?: string): boolean {
  if (!businessHours || typeof businessHours !== "object") return true;

  const now = new Date();

  // Get current day and time in the specified timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "long",
  });

  const parts = formatter.formatToParts(now);
  let hour = 0;
  let minute = 0;
  let weekday = "";

  for (const part of parts) {
    if (part.type === "hour") hour = Number(part.value);
    if (part.type === "minute") minute = Number(part.value);
    if (part.type === "weekday") weekday = part.value.toLowerCase();
  }

  const dayKey =
    WEEKDAY_MAP[
      ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(
        weekday,
      )
    ];

  if (!dayKey) return true;

  const shifts = (businessHours as BusinessHours)[dayKey];
  if (!shifts || shifts.length === 0) return false;

  const currentMinutes = hour * 60 + minute;

  for (const shift of shifts) {
    const openMins = toMinutes(shift.open);
    const closeMins = toMinutes(shift.close);

    // Overnight shift (e.g., 22:00 → 02:00)
    if (closeMins < openMins) {
      if (currentMinutes >= openMins || currentMinutes < closeMins) {
        return true;
      }
    } else {
      if (currentMinutes >= openMins && currentMinutes < closeMins) {
        return true;
      }
    }
  }

  return false;
}
