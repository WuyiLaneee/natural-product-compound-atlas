/**
 * Creates a fetch implementation that is safe to use from a static browser app.
 *
 * The shared source clients add server-oriented identification headers. A
 * custom X-Client-Name header forces a CORS preflight and User-Agent cannot be
 * controlled by browser JavaScript. Strip both at the final fetch boundary so
 * PubChem, ChEMBL, Europe PMC and ClinicalTrials.gov remain anonymous, simple
 * cross-origin GET requests. `Accept: application/json` is CORS-safelisted and
 * is intentionally retained.
 */
export function createBrowserFetchImpl(
  baseFetch: typeof fetch = globalThis.fetch,
): typeof fetch {
  if (typeof baseFetch !== "function") {
    throw new Error("This environment does not provide fetch().");
  }

  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.delete("User-Agent");
    headers.delete("X-Client-Name");

    return baseFetch(input, {
      ...init,
      headers,
      credentials: init.credentials ?? "omit",
      mode: init.mode ?? "cors",
    });
  };
}

/** Default browser-safe adapter used by the GitHub Pages data layer. */
export const browserFetchImpl: typeof fetch = async (input, init) => {
  return createBrowserFetchImpl()(input, init);
};
