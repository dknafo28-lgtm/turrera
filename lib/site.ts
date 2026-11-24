// Public address of the site, used for share previews, the sitemap and structured data.
export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://turrera.com").replace(/\/$/, "");
// WhatsApp number for buyer questions, digits only with country code (e.g. 13055550123). Hidden when not set.
export const WHATSAPP = (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
