// Single source of truth for which routes the i18n middleware covers.
// Middleware and LocaleSwitcher MUST stay aligned — drift produces broken toggles.
export const LANDING_ROUTE_PATTERN =
  /^(\/|\/(en)(\/.*)?|\/manifesto|\/pricing|\/features(\/.*)?|\/blog(\/.*)?)$/;

export function isLandingRoute(pathname: string): boolean {
  return LANDING_ROUTE_PATTERN.test(pathname);
}
