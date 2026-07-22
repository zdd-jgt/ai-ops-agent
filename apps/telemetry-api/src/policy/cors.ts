const TEST_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5174"];

export function createCorsOriginResolver(raw: string | undefined) {
  const source = raw ?? (process.env["NODE_ENV"] === "test" ? TEST_ORIGINS.join(",") : undefined);
  if (!source?.trim()) throw new Error("AIOPS_CORS_ORIGINS is required");
  const allowed = new Set(source.split(",").map((value) => value.trim()).filter(Boolean));
  if (allowed.size === 0 || allowed.has("*")) {
    throw new Error("AIOPS_CORS_ORIGINS must contain explicit origins");
  }
  return (origin: string): string | undefined => allowed.has(origin) ? origin : undefined;
}
