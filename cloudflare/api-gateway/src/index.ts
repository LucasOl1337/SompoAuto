export interface Env {
  BACKEND_ORIGIN: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed.replace(/\/+$/, "")}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const backendOrigin = normalizeOrigin(env.BACKEND_ORIGIN);
    if (!backendOrigin) {
      return withCors(
        new Response(
          JSON.stringify({ error: "BACKEND_ORIGIN is missing." }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      );
    }

    const incomingUrl = new URL(request.url);
    const upstreamUrl = `${backendOrigin}${incomingUrl.pathname}${incomingUrl.search}`;

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete("host");
    upstreamHeaders.delete("cf-connecting-ip");
    upstreamHeaders.delete("x-forwarded-for");
    upstreamHeaders.delete("x-real-ip");

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
    });

    return withCors(upstreamResponse);
  },
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
