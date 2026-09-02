const MIN_PASSWORD_LENGTH = 12;

export function getPasswordStrengthError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[a-z]/.test(password)) {
    return "La contraseña debe incluir al menos una letra minúscula.";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una letra mayúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un número.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un símbolo.";
  }
  return null;
}

async function sha1Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("No se pudo validar la seguridad de la contraseña en este navegador.");
  }

  const input = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-1", input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function isKnownCompromisedPassword(password: string): Promise<boolean> {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  // Pwned Passwords uses k-anonymity: only the first five SHA-1 characters
  // leave the browser. The password and its full hash are never transmitted.
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    method: "GET",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });

  if (!response.ok) {
    throw new Error("No pudimos comprobar si la contraseña fue filtrada. Intentá nuevamente.");
  }

  const body = await response.text();
  return body.split(/\r?\n/).some((line) => line.split(":", 1)[0]?.trim().toUpperCase() === suffix);
}

export async function getPasswordSecurityError(password: string): Promise<string | null> {
  const strengthError = getPasswordStrengthError(password);
  if (strengthError) return strengthError;

  const compromised = await isKnownCompromisedPassword(password);
  if (compromised) {
    return "Esa contraseña aparece en filtraciones conocidas. Elegí una contraseña distinta y única.";
  }

  return null;
}
