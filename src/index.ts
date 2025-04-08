import { Hono } from "hono";

const app = new Hono();

// Custom CORS handling to ensure cookies work properly
app.use("*", async (c, next) => {
  // Handle preflight OPTIONS requests
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "https://portal.gscwd.app",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, Cookie, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // For actual requests, process and add headers after receiving the response
  await next();

  // Now we have access to the response
  c.res.headers.set("Access-Control-Allow-Origin", "https://portal.gscwd.app");
  c.res.headers.set("Access-Control-Allow-Credentials", "true");
  c.res.headers.append("Access-Control-Expose-Headers", "Set-Cookie");
});

// Handle all requests by proxying to original backend
app.all("*", async (c) => {
  const url = new URL(c.req.url);

  // Forward the request to your origin server
  const originUrl = `https://api-portal.gscwd.app${url.pathname}${url.search}`;

  const requestHeaders = new Headers(c.req.raw.headers);

  // Make sure to include cookies in the request to the origin
  // Cloudflare Workers automatically forward cookies without needing credentials option
  const response = await fetch(originUrl, {
    method: c.req.method,
    headers: requestHeaders,
    body: ["GET", "HEAD"].includes(c.req.method)
      ? undefined
      : await c.req.arrayBuffer(),
  });

  // console.log({ originalResponse: response });

  // Create a response that keeps all original headers
  // We're avoiding the Hono response abstraction to maintain all headers exactly as they are
  const responseHeaders = new Headers(response.headers);

  // Return a raw Response to preserve all headers including Set-Cookie
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
});

export default app;
