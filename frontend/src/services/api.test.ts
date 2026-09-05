import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

/**
 * These cover two problems the app shipped with:
 *  - an unreachable backend fabricated a logged-in session, so any email and
 *    password "worked" and a fake token was stored;
 *  - FastAPI validation errors arrive as an array of objects, which was handed
 *    straight to `new Error()` and displayed as "[object Object]".
 */
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

afterEach(() => vi.unstubAllGlobals());

const respondWith = (status: number, body?: unknown) =>
  vi.fn(() => Promise.resolve(new Response(body === undefined ? '' : JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })));

const offline = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));

describe('an unreachable server never fabricates success', () => {
  beforeEach(() => vi.stubGlobal('fetch', offline));

  it('refuses to log anyone in', async () => {
    await expect(api.login('attacker@nowhere.invalid', 'wrong'))
      .rejects.toThrow(/Cannot reach the server/);
  });

  it('refuses to create an account', async () => {
    await expect(api.register('Al', 'a@b.com', 'password1'))
      .rejects.toThrow(/Cannot reach the server/);
  });

  it('refuses to invent a roast', async () => {
    await expect(api.createRoast(null, 'resume text', 'medium'))
      .rejects.toThrow(/Cannot reach the server/);
  });

  it('reports an error rather than an empty history', async () => {
    await expect(api.getHistory()).rejects.toThrow(/Cannot reach the server/);
  });

  it('reports a delete as failed', async () => {
    await expect(api.deleteRoast('x')).resolves.toBe(false);
  });
});

describe('server errors are turned into sentences', () => {
  it('names the field that failed validation', async () => {
    vi.stubGlobal('fetch', respondWith(422, {
      detail: [{ loc: ['body', 'password'], msg: 'String should have at least 6 characters' }],
    }));
    await expect(api.register('Al', 'a@b.com', 'abc'))
      .rejects.toThrow(/Password.*6 characters/i);
  });

  it('never shows [object Object]', async () => {
    vi.stubGlobal('fetch', respondWith(422, { detail: [{ loc: ['body', 'name'], msg: 'too short' }] }));
    await expect(api.register('A', 'a@b.com', 'password1'))
      .rejects.not.toThrow(/\[object Object\]/);
  });

  it('reports every failing field', async () => {
    vi.stubGlobal('fetch', respondWith(422, {
      detail: [
        { loc: ['body', 'name'], msg: 'String should have at least 2 characters' },
        { loc: ['body', 'password'], msg: 'String should have at least 6 characters' },
      ],
    }));
    const err = await api.register('A', 'a@b.com', 'abc').then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/name/i);
    expect(err!.message).toMatch(/password/i);
  });

  it("passes through the server's own wording", async () => {
    vi.stubGlobal('fetch', respondWith(401, { detail: 'Invalid email or password. Prepare for more pain.' }));
    await expect(api.login('a@b.com', 'nope')).rejects.toThrow(/Prepare for more pain/);
  });

  it('falls back to a plain sentence when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<html>502</html>', { status: 502 }))));
    await expect(api.login('a@b.com', 'x')).rejects.toThrow('Login failed.');
  });
});

describe('validating a stored session', () => {
  beforeEach(() => store.set('roast_token', 'a-token'));

  it('treats a missing token as no session', async () => {
    store.clear();
    expect((await api.getCurrentUser()).status).toBe('rejected');
  });

  it.each([401, 403, 404])('ends the session on %i', async code => {
    vi.stubGlobal('fetch', respondWith(code, { detail: 'nope' }));
    expect((await api.getCurrentUser()).status).toBe('rejected');
  });

  it('keeps the session when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', offline);
    expect((await api.getCurrentUser()).status).toBe('unreachable');
  });

  it('keeps the session on a server error', async () => {
    vi.stubGlobal('fetch', respondWith(500, { detail: 'boom' }));
    expect((await api.getCurrentUser()).status).toBe('unreachable');
  });

  it('returns the user for a valid token', async () => {
    vi.stubGlobal('fetch', respondWith(200, { id: '1', name: 'Real User', email: 'a@b.com', created_at: 'now' }));
    const check = await api.getCurrentUser();
    expect(check).toMatchObject({ status: 'valid', user: { name: 'Real User' } });
  });
});

describe('a successful login', () => {
  it('returns the token the server issued', async () => {
    vi.stubGlobal('fetch', respondWith(200, {
      access_token: 'real-token',
      user: { id: '1', name: 'Jo', email: 'a@b.com', created_at: 'now' },
    }));
    expect((await api.login('a@b.com', 'right')).access_token).toBe('real-token');
  });
});
