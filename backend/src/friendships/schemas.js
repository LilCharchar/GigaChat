import { z } from "zod";

const ALLOWED_CHARS = new Set("abcdefghijklmnopqrstuvwxyz0123456789_.");

function isValidUsernameFormat(value) {
  return value.length >= 3 && value.length <= 30 && [...value].every((c) => ALLOWED_CHARS.has(c));
}

export const sendRequestParamsSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .transform((v) => v.trim().toLowerCase())
    .refine(isValidUsernameFormat, "Invalid username format"),
});

export const respondRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const respondRequestBodySchema = z.object({
  action: z.enum(["accept", "reject"]),
});
