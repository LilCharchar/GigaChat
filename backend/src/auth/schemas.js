import { z } from "zod";

const ALLOWED_USERNAME_CHARS = new Set("abcdefghijklmnopqrstuvwxyz0123456789_.");

function isValidUsernameFormat(value) {
  return (
    value.length >= 3 &&
    value.length <= 30 &&
    [...value].every((c) => ALLOWED_USERNAME_CHARS.has(c))
  );
}

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(30),
  email: z.email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    username: z
      .string()
      .min(3)
      .max(30)
      .transform((v) => v.trim().toLowerCase())
      .refine(isValidUsernameFormat, "Invalid username format")
      .optional(),
    bio: z.string().max(160).nullable().optional(),
    avatarBase64: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

export const adminUserParamsSchema = z.object({
  userId: z.uuid(),
});

export const banUserBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const timeoutUserBodySchema = z.object({
  minutes: z.int().min(1).max(43200),
  reason: z.string().trim().min(1).max(500).optional(),
});
