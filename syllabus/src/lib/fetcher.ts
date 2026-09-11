// Client-side fetch helpers. Throw an Error (with .status and .data) on non-2xx.

export type ApiErr = Error & { status: number; data: any };

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || "Something went wrong") as ApiErr;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function apiGet(url: string) {
  return fetch(url, { credentials: "same-origin" }).then(handle);
}

export function apiPost(url: string, body?: unknown) {
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then(handle);
}
