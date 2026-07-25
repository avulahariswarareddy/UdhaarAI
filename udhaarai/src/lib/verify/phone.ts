import { normaliseDigits } from "./numerals";

/**
 * Indian mobile validation. Deterministic — a number either is or isn't one.
 *
 * This is a confidence *override*: if Gemini returns a 9-digit "phone" at 0.95,
 * that 0.95 is wrong no matter how sure the model felt. Structure beats vibes.
 */
export type PhoneCheck = {
  normalised: string;   // bare 10 digits, or "" if unusable
  valid: boolean;
  reason?: string;
};

export function checkPhone(raw: unknown): PhoneCheck {
  if (typeof raw !== "string" || !raw.trim()) {
    return { normalised: "", valid: true }; // absence is certain, not an error
  }

  let d = normaliseDigits(raw).replace(/\D/g, "");

  // Strip country code and trunk prefix
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 13 && d.startsWith("091")) d = d.slice(3);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);

  if (d.length !== 10) {
    return { normalised: d, valid: false, reason: `${d.length} digits, not 10` };
  }
  if (!/^[6-9]/.test(d)) {
    return { normalised: d, valid: false, reason: "Indian mobiles start with 6-9" };
  }
  if (/^(\d)\1{9}$/.test(d)) {
    return { normalised: d, valid: false, reason: "all digits identical" };
  }
  return { normalised: d, valid: true };
}

/** +91 form, for WhatsApp deep links. */
export function toWhatsApp(tenDigits: string): string | null {
  const c = checkPhone(tenDigits);
  return c.valid && c.normalised.length === 10 ? `91${c.normalised}` : null;
}
