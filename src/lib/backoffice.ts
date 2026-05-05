export const BACKOFFICE_DOMAIN = "reactivesoftware.com.br";

export function isBackofficeUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${BACKOFFICE_DOMAIN}`);
}
