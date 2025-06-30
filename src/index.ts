import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  cors({
    origin: [
      "https://portal.gscwd.app",
      "http://pds.gscwd.app",
      "https://emp.gscwd.app",
      "http://localhost:3000",
      "https://api-portal.gscwd.app",
    ],
    allowMethods: ["POST", "GET", "OPTIONS", "POST", "DELETE", "PUT", "PATCH"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
    ],
    maxAge: 86400,
    credentials: true,
  })
);

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
