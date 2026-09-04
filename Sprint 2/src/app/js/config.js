const defaultApiUrl = new URL("../../../api/", import.meta.url).href.replace(/\/$/, "");
const configuredApiUrl = globalThis.FUNDS_MANAGER_CONFIG?.apiBaseUrl;

export const API_BASE_URL = typeof configuredApiUrl === "string" && configuredApiUrl.trim()
  ? configuredApiUrl.replace(/\/$/, "")
  : defaultApiUrl;
