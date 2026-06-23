import { RateLimiterMemory } from 'rate-limiter-flexible';

// Simple in-memory rate limiter for demo
// For production: Use Upstash Redis or similar for distributed rate limiting
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'powforge_api',
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
});

export async function checkRateLimit(identifier: string) {
  try {
    await rateLimiter.consume(identifier);
    return { success: true };
  } catch (rejRes: any) {
    const msBeforeNext = rejRes.msBeforeNext || 60000;
    return {
      success: false,
      retryAfter: Math.round(msBeforeNext / 1000),
    };
  }
}
```

Update the launchpad API route with rate limiting and better error handling.