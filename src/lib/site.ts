export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const AUTHOR = {
  name: "Arkel Lahi",
  github: "https://github.com/vortex378",
  repo: "https://github.com/vortex378/floorline",
} as const;
