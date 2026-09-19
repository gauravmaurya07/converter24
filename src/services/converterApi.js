/**
 * Client for the converter24 media API (see /server).
 *
 * Flow:  wakeServer() -> startJob() -> pollJob() -> fileUrl(id)
 * A conversion runs as a background job on the server, so the browser never
 * has to keep one long HTTP request open.
 */
const API_BASE = (import.meta.env.VITE_CONVERTER_API_URL || '').replace(/\/$/, '');

export const isConfigured = () => Boolean(API_BASE);

export class ApiError extends Error {
  constructor(message, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

// fetch with a timeout that also respects the caller's abort signal
async function fetchTimeout(url, { timeoutMs = 15000, signal, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function request(path, init = {}) {
  let res;
  try {
    res = await fetchTimeout(`${API_BASE}${path}`, init);
  } catch (e) {
    if (e.name === 'AbortError' && init.signal?.aborted) throw e;
    throw new ApiError('Could not reach the conversion server. Please check your connection and try again.', 'network');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Server error (${res.status}). Please try again.`, data?.code || `http_${res.status}`);
  }
  return data;
}

/** Free hosting sleeps when idle. Keep pinging /health until the server answers. */
export async function wakeServer({ signal, onSlow, timeoutMs = 90000 } = {}) {
  const started = Date.now();
  let told = false;
  for (;;) {
    try {
      const res = await fetchTimeout(`${API_BASE}/health`, { timeoutMs: 8000, signal, cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {
      if (signal?.aborted) throw e;
    }
    if (!told && Date.now() - started > 4000) {
      told = true;
      onSlow?.();
    }
    if (Date.now() - started > timeoutMs) {
      throw new ApiError('The conversion server did not wake up in time. Please try again in a moment.', 'wake_timeout');
    }
    await sleep(3000, signal);
  }
}

export function startJob({ url, format, quality }, signal) {
  return request('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format, quality }),
    signal,
  });
}

/** Polls until the job is done. Resolves with the final job, rejects with ApiError on failure. */
export async function pollJob(id, { signal, onUpdate } = {}) {
  let failures = 0;
  const started = Date.now();
  for (;;) {
    let job;
    try {
      job = await request(`/api/jobs/${id}`, { signal, timeoutMs: 10000, cache: 'no-store' });
      failures = 0;
    } catch (e) {
      if (e.name === 'AbortError' || e.code === 'not_found') throw e;
      if (++failures >= 6) throw e; // tolerate brief network blips
    }
    if (job) {
      onUpdate?.(job);
      if (job.status === 'done') return job;
      if (job.status === 'error') throw new ApiError(job.error || 'Conversion failed.', job.errorCode || 'failed');
    }
    await sleep(Date.now() - started > 30000 ? 1500 : 1000, signal);
  }
}

export const fileUrl = (id) => `${API_BASE}/api/jobs/${id}/file`;
