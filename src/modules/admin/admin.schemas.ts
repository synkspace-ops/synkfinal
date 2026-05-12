import { z } from "zod";

export const listUsersSchema = z.object({
  role: z.enum(["CREATOR", "BRAND", "ORGANISER", "ADMIN"]).optional(),
  status: z.enum(["PENDING", "VERIFIED", "SUSPENDED"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const listRegistrationsSchema = z.object({
  role: z.enum(["CREATOR", "BRAND", "ORGANISER"]).default("CREATOR"),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["VERIFIED", "SUSPENDED"]),
});

export const resolveDisputeSchema = z.object({
  action: z.enum(["release", "refund"]),
});

export const listMessageAuditSchema = z.object({
  applicationId: z.string().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});
