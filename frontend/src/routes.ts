/**
 * The five screens and the URLs they live at.
 *
 * The app previously held the current screen in component state alone, so the
 * address bar always read "/". That meant the browser's back button did
 * nothing, a refresh always dumped you back on the landing page, and no screen
 * could be linked to or bookmarked.
 */
export type Page = 'landing' | 'roast' | 'history' | 'login' | 'register';

export const PATHS: Record<Page, string> = {
  landing: '/',
  roast: '/roast',
  history: '/history',
  login: '/login',
  register: '/register',
};

const BY_PATH = new Map<string, Page>(
  (Object.entries(PATHS) as [Page, string][]).map(([page, path]) => [path, page]),
);

/** The screen a URL refers to. Anything unrecognised falls back to the landing page. */
export function pageFromPath(pathname: string): Page {
  // Tolerate a trailing slash so /history/ and /history are the same screen.
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return BY_PATH.get(normalised || '/') ?? 'landing';
}

export function pathForPage(page: Page): string {
  return PATHS[page] ?? PATHS.landing;
}

/** True when the URL does not name a real screen, so it should be corrected. */
export function isUnknownPath(pathname: string): boolean {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return !BY_PATH.has(normalised || '/');
}
