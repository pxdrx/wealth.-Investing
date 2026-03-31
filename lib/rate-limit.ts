import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// AI Coach: 3 requests per 60 seconds per user
export const aiCoachRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  prefix: "ratelimit:ai-coach",
});

// Analyst: 5 requests per 60 seconds per user
export const analystRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "ratelimit:analyst",
});

// Feedback: 5 requests per 10 minutes per user
export const feedbackRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "600 s"),
  prefix: "ratelimit:feedback",
});

// General API: 30 requests per 60 seconds per IP
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "ratelimit:api",
});
