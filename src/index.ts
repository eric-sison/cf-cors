import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Add CORS middleware
app.use(
  "*",
  cors({
    origin: "https://portal.gscwd.app",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision", "Set-Cookie"],
    maxAge: 600,
    credentials: true, // This is important for cookies to work
  })
);

// Handle all requests by proxying to original backend
app.all("*", async (c) => {
  const url = new URL(c.req.url);

  // Forward the request to your origin server
  // Make sure to replace this with your actual origin address if different
  const originUrl = `https://api-portal.gscwd.app${url.pathname}${url.search}`;

  const response = await fetch(originUrl, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: ["GET", "HEAD"].includes(c.req.method)
      ? undefined
      : await c.req.arrayBuffer(),
  });

  // Return the response from your origin
  // Create a new response to ensure headers are properly handled
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  // Ensure Set-Cookie headers are preserved
  const cookies = response.headers.getAll("Set-Cookie");
  if (cookies.length > 0) {
    // Remove any existing Set-Cookie headers from the new response
    newResponse.headers.delete("Set-Cookie");
    // Add each cookie individually
    cookies.forEach((cookie) => {
      newResponse.headers.append("Set-Cookie", cookie);
    });
  }

  return newResponse;
});

export default app;
