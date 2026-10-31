export class ClientApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = Record<string, unknown>>(
  input: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init || {};
  const response = await fetch(input, {
    ...rest,
    headers: {
      ...(json ? { "content-type": "application/json" } : {}),
      ...rest.headers,
    },
    body: json ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    throw new ClientApiError(
      typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
      response.status,
    );
  }
  return data as T;
}

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok || !data.url) {
    throw new ClientApiError(data.error || "Upload failed.", response.status);
  }
  return data.url as string;
}
