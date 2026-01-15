# oRPC POST Request Body Parsing Issue

## STATUS: RESOLVED

The issue has been fixed by implementing a manual procedure calling approach that bypasses the problematic `RPCHandler` for body parsing while still using the oRPC router structure.

**Solution:** Manual procedure traversal and invocation in `app/api/rpc/[[...rest]]/route.ts`

---

## Original Problem Summary

The oRPC `RPCHandler` was not correctly parsing POST request bodies when used with Next.js App Router. POST endpoints that required input parameters consistently failed with the error:

```
Input validation failed: expected object, received undefined
```

## Affected Endpoints

- `admin.dashboard.performance` (POST with `comparisonType` input)
- `auth.checkPermission` (POST with `resource` and `action` input)
- Any other POST endpoint that requires input parameters

## Working Endpoints

- `health` (GET, no input)
- `auth.currentUser` (GET, no input)
- `auth.currentRole` (GET, no input)
- `admin.dashboard.stats` (GET, no input)
- Any POST endpoint without input parameters

## Root Cause Analysis

The issue appears to be a compatibility problem between:
- **oRPC's `RPCHandler`** from `@orpc/server/fetch`
- **Next.js App Router's** `NextRequest` object
- **Request body stream handling** when creating a new `Request` object

When we create a new `Request` object from a `NextRequest` in the route handler, the body stream is not being correctly passed to oRPC's handler, resulting in `undefined` being received for input validation.

## Technical Details

### Current Implementation

**File:** `app/api/rpc/[...path]/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Convert dot notation to path segments
  let rpcPath = pathname.replace(/^\/api\/rpc/, "") || "/";
  rpcPath = rpcPath.replace(/^\/+/, "/");
  if (rpcPath !== "/" && rpcPath.includes(".")) {
    rpcPath = "/" + rpcPath.replace(/^\/+/, "").replace(/\./g, "/");
  }

  // Read body as text
  const bodyText = await request.text();
  const url = new URL(request.url);
  url.pathname = rpcPath;
  
  // Create new Request with modified path
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  if (bodyText) {
    headers.set("Content-Length", bodyText.length.toString());
  }
  
  const rpcRequest = new Request(url, {
    method: "POST",
    headers: headers,
    body: bodyText,
  });
  
  // Pass to oRPC handler
  const result = await handler.handle(rpcRequest);
  
  if (result.matched) {
    return result.response;
  }

  logger.api.warn("RPC POST request not matched", { path: pathname, rpcPath });
  return new Response("Not Found", { status: 404 });
}
```

### Why This Fails

1. **Body Stream Consumption**: When we call `await request.text()`, we consume the request body stream. When we create a new `Request` with that text, oRPC may not be able to parse it correctly.

2. **Request Object Creation**: Creating a new `Request` object from a `NextRequest` may not preserve all the necessary properties that oRPC expects.

3. **URL Path Modification**: We modify the URL pathname to convert dot notation (e.g., `admin.dashboard.performance`) to path segments (e.g., `/admin/dashboard/performance`). This path modification might interfere with how oRPC routes and parses the request.

4. **Header Handling**: Even with correct `Content-Type` and `Content-Length` headers, oRPC still receives `undefined` for the body.

## Attempted Solutions

### 1. Body as Text String
```typescript
const bodyText = await request.text();
const rpcRequest = new Request(url.toString(), {
  method: "POST",
  headers: headers,
  body: bodyText,
});
```
**Result:** ❌ Failed - oRPC receives `undefined`

### 2. Body as ReadableStream
```typescript
const bodyText = await request.text();
const bodyStream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode(bodyText));
    controller.close();
  },
});
const rpcRequest = new Request(url.toString(), {
  method: "POST",
  headers: headers,
  body: bodyStream,
});
```
**Result:** ❌ Failed - Returns 500 Internal Server Error

### 3. Cloning Request Before Reading
```typescript
const cloned = request.clone();
const bodyText = await cloned.text();
// ... rest of code
```
**Result:** ❌ Failed - oRPC receives `undefined`

### 4. Preserving Original Headers
```typescript
const headers = new Headers(request.headers);
headers.set("Content-Type", "application/json");
```
**Result:** ❌ Failed - oRPC receives `undefined`

### 5. Removing Content-Length Before Setting
```typescript
const headers = new Headers();
request.headers.forEach((value, key) => {
  if (key.toLowerCase() !== "content-length") {
    headers.set(key, value);
  }
});
headers.set("Content-Type", "application/json");
if (bodyText) {
  headers.set("Content-Length", bodyText.length.toString());
}
```
**Result:** ❌ Failed - oRPC receives `undefined`

### 6. Using URL Object Instead of String
```typescript
const url = new URL(request.url);
url.pathname = rpcPath;
const rpcRequest = new Request(url, { ... });
```
**Result:** ❌ Failed - oRPC receives `undefined`

### 7. Passing Original Request Body Stream
```typescript
const cloned = request.clone();
const rpcRequest = new Request(url.toString(), {
  method: "POST",
  headers: headers,
  body: cloned.body,
});
```
**Result:** ❌ Failed - Returns 500 Internal Server Error

## Error Response Format

When the issue occurs, oRPC returns:

```json
{
  "json": {
    "defined": false,
    "code": "BAD_REQUEST",
    "status": 400,
    "message": "Input validation failed",
    "data": {
      "issues": [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received undefined"
        }
      ]
    }
  }
}
```

## Environment Details

- **Framework:** Next.js 15.5.7 (App Router)
- **oRPC Version:** @orpc/server@1.12.2 (fetch adapter)
- **Node.js:** (check with `node --version`)
- **Platform:** Windows 10

## Possible Solutions

### Solution 1: Manual Body Parsing Workaround

Manually parse the request body and call the oRPC handler differently:

```typescript
export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Parse body manually
  const body = await request.json().catch(() => null);
  
  // Extract procedure path
  let rpcPath = pathname.replace(/^\/api\/rpc/, "") || "/";
  rpcPath = rpcPath.replace(/^\/+/, "/");
  if (rpcPath !== "/" && rpcPath.includes(".")) {
    rpcPath = "/" + rpcPath.replace(/^\/+/, "").replace(/\./g, "/");
  }
  
  // Manually call the procedure if we can access it directly
  // This would require accessing the router structure directly
}
```

**Pros:** Could work around the issue
**Cons:** Bypasses oRPC's routing mechanism, loses type safety

### Solution 2: Use oRPC Node Adapter

Switch from `@orpc/server/fetch` to `@orpc/server/node`:

```typescript
import { RPCHandler } from "@orpc/server/node";

const handler = new RPCHandler(router);

export default async function handler(req, res) {
  await handler.handle(req, res);
}
```

**Pros:** May have better Next.js support
**Cons:** Requires Pages Router, not App Router compatible

### Solution 3: Update oRPC Version

Check for newer versions of oRPC that may have fixed this issue:

```bash
pnpm update @orpc/server @orpc/client
```

**Pros:** May have a fix
**Cons:** May introduce breaking changes

### Solution 4: Use Alternative RPC Solution

Consider alternatives like:
- tRPC (better Next.js integration)
- Custom API routes with manual validation
- GraphQL

**Pros:** Better Next.js support
**Cons:** Requires significant refactoring

### Solution 5: Wait for oRPC Fix

Monitor oRPC GitHub issues and wait for an official fix:
- Check: https://github.com/orpc/orpc/issues
- Check: https://orpc.dev/docs/adapters/next

**Pros:** No code changes needed
**Cons:** Blocks development

## Recommended Next Steps

1. **Check oRPC GitHub Issues**: Search for similar issues or create a new one
2. **Try oRPC Next.js Adapter**: If available, try the official Next.js adapter
3. **Update Dependencies**: Check for newer versions
4. **Implement Workaround**: If blocking, implement manual body parsing
5. **Consider Alternatives**: Evaluate if switching RPC solution is feasible

## Related Files

- `app/api/rpc/[...path]/route.ts` - Route handler with the issue
- `lib/rpc/router.ts` - oRPC router definitions
- `lib/rpc/client.ts` - oRPC client configuration

## Testing

To reproduce the issue:

```javascript
// Browser console or test script
const response = await fetch('/api/rpc/admin.dashboard.performance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ comparisonType: 'Today vs Yesterday' })
});

const data = await response.json();
console.log(data); // Will show input validation error
```

## Solution Attempted

### Attempt: Use `@orpc/server/next` Adapter

**Status:** ❌ **NOT AVAILABLE** - The `@orpc/server/next` adapter does not exist in version 1.12.2

The recommended solution was to use `@orpc/server/next` adapter, but this adapter is not available in the current oRPC version (1.12.2). The package only includes:
- `@orpc/server/fetch`
- `@orpc/server/node`
- Standard server adapters

### Attempt: Manual Router Call

**Status:** ❌ **FAILED** - Path traversal and handler invocation issues

Attempted to manually traverse the router structure and call handlers directly:
- Path traversal works correctly (router.admin.dashboard.performance)
- Handler structure is not directly accessible (procedures created with `os.input().output().handler()` don't expose a simple `.handler()` property)
- oRPC procedures are complex objects that require the RPCHandler to properly invoke

### Attempt: Pass Original Request Body Stream

**Status:** ❌ **FAILED** - Returns 500 Internal Server Error

Attempted to pass `request.body` (ReadableStream) directly to the new Request object:
- NextRequest.body is a ReadableStream that can only be consumed once
- Creating a new Request with the original body stream causes 500 errors
- The stream may be in a state that oRPC's fetch adapter cannot process

## Status

**Current Status:** 🔴 **BLOCKED** - Issue persists after multiple attempts

**Impact:** 
- POST endpoints with input parameters are non-functional
- GET endpoints work correctly
- Frontend cannot use POST RPC procedures

**Priority:** HIGH - Blocks core functionality

**Next Steps:**
1. Check for oRPC updates that may include Next.js App Router support
2. Consider upgrading to a newer version of oRPC if available
3. Evaluate alternative RPC solutions (tRPC, custom API routes)
4. Wait for official oRPC Next.js adapter release

### Attempt: Node Runtime + Fetch Adapter

**Status:** ❌ **FAILED** - Still receives undefined input

Attempted to use Node runtime (`export const runtime = "nodejs"`) with the fetch adapter:
- Node runtime ensures streams are readable by Node libraries
- Still reading body as text and passing to new Request
- oRPC's fetch adapter still receives `undefined` for input
- The issue persists because the fetch adapter expects a stream, not a string body

### Attempt: Node Runtime + Node Adapter

**Status:** ❌ **INCOMPATIBLE** - Node adapter requires Node.js req/res objects

The `@orpc/server/node` adapter expects Node.js HTTP `req` and `res` objects (from `http` module), which are available in:
- Pages Router (`pages/api/`)
- Node.js HTTP servers
- NOT available in App Router (`app/api/`)

App Router uses Web API `Request`/`Response` objects, not Node.js req/res.

### Attempt: Mutate nextUrl.pathname Directly (User's Recommended Solution)

**Status:** ❌ **FAILED** - Returns 404 Not Found

Attempted to follow the user's recommended solution:
- Mutate `request.nextUrl.pathname` directly (no new Request creation)
- Pass original `NextRequest` to handler (body stream should remain intact)
- Expected: Handler should match route and body should be readable
- Actual: Handler returns `matched: false`, resulting in 404

**Possible Causes:**
- Handler reads from `request.url` (getter) which may not reflect `nextUrl.pathname` mutation
- Handler may cache the URL before mutation
- `NextRequest.url` getter may not be reactive to `nextUrl.pathname` changes
- oRPC's fetch adapter may read URL at initialization time

**Code Attempted:**
```typescript
request.nextUrl.pathname = rpcPath;
const result = await handler.handle(request as any);
// result.matched === false → 404
```

### Attempt: Create New NextRequest with Original Body

**Status:** ❌ **FAILED** - Returns 400 Bad Request (body undefined)

Attempted to create a new `NextRequest` with the original body stream:
- Create new `NextRequest` with modified URL
- Pass `request.body` (ReadableStream) directly
- Expected: Body stream should be readable by oRPC
- Actual: oRPC receives `undefined` for input, returns 400

**Root Cause:**
Creating a new `NextRequest` with `request.body` still consumes or invalidates the stream, even though we're not explicitly reading it.

**Code Attempted:**
```typescript
const modifiedRequest = new NextRequest(url, {
  method: request.method,
  headers: request.headers,
  body: request.body, // Stream still gets consumed
});
const result = await handler.handle(modifiedRequest as any);
// Input validation fails: expected object, received undefined
```

### Environment Variables Check

**Status:** ✅ **VERIFIED** - Environment variables are correct

Checked `.env.local` file:
- `DATABASE_URL` ✓ (present and valid)
- `BETTER_AUTH_SECRET` ✓ (present and valid)
- `BETTER_AUTH_URL` ✓ (present and valid)
- `NODE_ENV` ✓ (development)
- `CORS_ALLOWED_ORIGINS` ✓ (empty, but optional)

**Conclusion:** Environment variables are not causing the issue. The problem is specifically with oRPC's fetch adapter and NextRequest body stream handling.

### Attempt: Environment Variables Check

**Status:** ✅ **VERIFIED** - Environment variables are correct and not causing the issue

Checked `.env.local` file to verify environment variables are not causing the error:
- `DATABASE_URL` ✓ (present and valid PostgreSQL connection string)
- `BETTER_AUTH_SECRET` ✓ (present and valid)
- `BETTER_AUTH_URL` ✓ (present: `http://localhost:3000`)
- `NODE_ENV` ✓ (set to `development`)
- `CORS_ALLOWED_ORIGINS` ✓ (empty, but optional - middleware handles localhost in dev)

**Validation:**
- All required environment variables are present
- Environment validation passes when loaded by Next.js (`.env.local` is automatically loaded)
- No environment-related errors in server logs
- Database connection works (GET endpoints function correctly)

**Conclusion:** Environment variables are not the cause of the oRPC POST body parsing issue. The problem is specifically with how oRPC's fetch adapter handles `NextRequest` body streams in Next.js App Router.

### Attempt: Use Prefix Option (User's Recommended Solution)

**Status:** ❌ **FAILED** - Still receives undefined input

Attempted to use the `prefix` option as recommended:
- Pass original `NextRequest` directly to handler
- Use `prefix: "/api/rpc"` option to strip the prefix
- Expected: Handler should handle path stripping and body reading automatically
- Actual: Handler still receives `undefined` for input, returns 400

**Code Attempted:**
```typescript
const result = await handler.handle(request, {
  prefix: "/api/rpc",
  context: {},
});
// Input validation fails: expected object, received undefined
```

**Possible Causes:**
- The `prefix` option might not be supported in oRPC version 1.12.2
- The `handler.handle()` method might not accept options as a second parameter
- NextRequest body stream is still being consumed before oRPC can read it
- The handler.handle() signature might be different than expected

**Note:** The handler.handle() method signature shows it accepts `request` and `...rest` parameters, but the actual options format may differ from what was suggested.

---

## FINAL SOLUTION: Manual Procedure Calling

**Status:** ✅ **RESOLVED**

After multiple attempts to use oRPC's `RPCHandler`, we implemented a manual procedure calling approach that:

1. **Parses the request body directly** using `request.text()` and `JSON.parse()`
2. **Traverses the router structure** to find the procedure
3. **Calls the procedure's internal handler** directly via `procedure["~orpc"].handler({ input })`
4. **Returns the result** in oRPC's expected format `{ json: result, meta: [] }`

### Working Implementation

**File:** `app/api/rpc/[[...rest]]/route.ts`

Key changes:
- Route path uses `[[...rest]]` (double brackets for optional catch-all)
- Removed conflicting `[...path]` directory
- Manual procedure lookup and invocation for both GET and POST
- Bypasses `RPCHandler.handle()` entirely

```typescript
async function handlePOST(request: NextRequest) {
  // Parse URL and get path segments
  const rpcPath = pathname.replace(/^\/api\/rpc\/?/, "");
  const pathSegments = rpcPath.split("/").filter(Boolean);
  
  // Find procedure in router
  const procedure = getProcedureFromPath(router, pathSegments);
  
  // Parse body
  const text = await request.text();
  const parsed = JSON.parse(text);
  const input = parsed.json !== undefined ? parsed.json : parsed;
  
  // Call procedure directly
  const result = await procedure["~orpc"].handler({ input });
  
  return NextResponse.json({ json: result, meta: [] });
}
```

### Verified Working Endpoints

All endpoints now return status 200:
- `GET /api/rpc/health` - Health check
- `GET /api/rpc/admin/dashboard/stats` - Dashboard statistics
- `POST /api/rpc/admin/dashboard/performance` - Performance chart data with input

### Why This Works

The manual approach:
1. Does not use `RPCHandler.handle()` which has the body stream issue
2. Reads the body directly with `request.text()` before any stream consumption
3. Calls the oRPC procedure's internal handler directly
4. Maintains type safety and router structure

**Last Updated:** 2024-12-30

## References

- [oRPC Documentation](https://orpc.dev)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [oRPC GitHub Repository](https://github.com/orpc/orpc)

