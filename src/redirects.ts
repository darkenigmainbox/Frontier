/**
 * Legacy #/chapter links (from the first build) are forwarded to the real path.
 * Runs before React mounts so there is no flash of the cover page.
 */
export function applyLegacyRedirect() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash) return;
  const target = hash === "home" ? "/" : "/" + hash;
  window.history.replaceState({}, "", target);
}
