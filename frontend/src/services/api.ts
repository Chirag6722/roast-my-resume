import type { RoastResult, HistoryItemSummary, User, RoastIntensity, ScoreResult } from '../types';

/** Outcome of validating a stored token against the server. */
export type SessionCheck =
  | { status: 'valid'; user: User }
  | { status: 'rejected' }
  | { status: 'unreachable' };

export const API_BASE_URL = 'http://localhost:8000/api';

const GUEST_ID_KEY = 'roast_guest_id';

// A stable, random id per browser so anonymous users get their own Burn Book
// without an account. It never identifies a person, only this browser.
const getGuestId = (): string => {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = 'guest_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest_ephemeral';
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('roast_token');
  const headers: Record<string, string> = { 'X-Guest-Id': getGuestId() };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const OFFLINE_MESSAGE = 'Cannot reach the server. Make sure the backend is running on port 8000.';

/**
 * FastAPI reports business errors as a string `detail`, but validation failures
 * as an array of objects. Passing that array straight to `new Error()` produced
 * "[object Object]" instead of telling the user their password was too short.
 */
const describeError = async (res: Response, fallback: string): Promise<string> => {
  let detail: unknown;
  try {
    detail = (await res.json())?.detail;
  } catch {
    return fallback;
  }
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map(d => {
        const field = Array.isArray(d?.loc) ? String(d.loc[d.loc.length - 1]) : '';
        const msg = typeof d?.msg === 'string' ? d.msg : '';
        if (!msg) return '';
        return field ? `${field[0].toUpperCase()}${field.slice(1)}: ${msg.replace(/^String /, '')}` : msg;
      })
      .filter(Boolean);
    if (messages.length) return messages.join('. ') + '.';
  }
  return fallback;
};

/** True when the request never reached the server, as opposed to being rejected by it. */
const isNetworkFailure = (err: unknown): boolean =>
  err instanceof TypeError || (err instanceof Error && /fetch|network/i.test(err.message));

export const api = {
  // Auth
  async register(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) throw new Error(await describeError(res, 'Registration failed.'));
      return await res.json();
    } catch (err) {
      // Never fabricate an account. Signing someone in without the server having
      // agreed is a lie, and the token would be rejected on the next request.
      if (isNetworkFailure(err)) throw new Error(OFFLINE_MESSAGE);
      throw err;
    }
  },

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await describeError(res, 'Login failed.'));
      return await res.json();
    } catch (err) {
      // Previously an unreachable backend let ANY email and password "log in"
      // with a fake token. Authentication has to come from the server.
      if (isNetworkFailure(err)) throw new Error(OFFLINE_MESSAGE);
      throw err;
    }
  },

  /**
   * Ask the server who this token belongs to.
   *
   * The three outcomes have to stay distinct: a rejected token must end the
   * session, while an unreachable server must not, or a dropped connection
   * would log people out. Collapsing both into `null` meant a dead token kept
   * showing the user as signed in.
   */
  async getCurrentUser(): Promise<SessionCheck> {
    const token = localStorage.getItem('roast_token');
    if (!token) return { status: 'rejected' };
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: getAuthHeaders() });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return { status: 'rejected' };
      }
      if (!res.ok) return { status: 'unreachable' };
      return { status: 'valid', user: await res.json() };
    } catch {
      return { status: 'unreachable' };
    }
  },

  // Roasts
  async createRoast(
    file: File | null,
    resumeText: string,
    intensity: RoastIntensity,
    targetJob?: string
  ): Promise<RoastResult> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (resumeText) {
      formData.append('resume_text', resumeText);
    }
    formData.append('intensity', intensity);
    if (targetJob) {
      formData.append('target_job', targetJob);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/roast`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error(await describeError(res, 'Could not roast that resume.'));
      return await res.json();
    } catch (err) {
      // There used to be a fabricated roast here, invented employers and all,
      // shown as if it were a real reading of the user's resume. Say what
      // happened instead.
      if (isNetworkFailure(err)) throw new Error(OFFLINE_MESSAGE);
      throw err;
    }
  },

  /** Re-score edited resume text with the same rubric as the report card. Saves nothing. */
  async scoreText(text: string): Promise<ScoreResult> {
    const res = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not score that text.');
    }
    return await res.json();
  },

  // History
  async getHistory(): Promise<HistoryItemSummary[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/history`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await describeError(res, 'Could not load your history.'));
      return await res.json();
    } catch (err) {
      if (isNetworkFailure(err)) throw new Error(OFFLINE_MESSAGE);
      throw err;
    }
  },

  async getRoastById(id: string): Promise<RoastResult | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/history/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteRoast(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/history/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch {
      // The server was never reached, so nothing was deleted. Reporting success
      // here made the UI drop a row that then reappeared on the next refresh.
      return false;
    }
  }
};
