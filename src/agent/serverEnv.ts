import { z } from "zod";

const envSchema = z.object({
  GOOGLE_API_KEY: z.string().min(1, "GOOGLE_API_KEY is required"),
  GOOGLE_IMAGE_MODEL: z.string().min(1, "GOOGLE_IMAGE_MODEL is required"),
});

export type GoogleImageEnv = z.infer<typeof envSchema>;

export function parseGoogleImageEnv(input: Record<string, string | undefined>): GoogleImageEnv {
  return envSchema.parse({
    GOOGLE_API_KEY: input.GOOGLE_API_KEY,
    GOOGLE_IMAGE_MODEL: input.GOOGLE_IMAGE_MODEL,
  });
}
