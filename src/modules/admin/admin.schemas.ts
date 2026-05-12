import { z } from "zod";

const roleSchema = z.enum(["CREATOR", "BRAND", "ORGANISER", "ADMIN"]);
const statusSchema = z.enum(["PENDING", "VERIFIED", "SUSPENDED"]);
const campaignStatusSchema = z.enum(["DRAFT", "ACTIVE", "CLOSED", "COMPLETED"]);
const applicationStatusSchema = z.enum(["APPLIED", "SHORTLISTED", "ACCEPTED", "REJECTED"]);
const paginationSchema = {
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
};

export const listUsersSchema = z.object({
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  ...paginationSchema,
});

export const listRegistrationsSchema = z.object({
  role: z.enum(["CREATOR", "BRAND", "ORGANISER"]).default("CREATOR"),
  search: z.string().trim().max(120).optional(),
  page: paginationSchema.page,
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const updateUserStatusSchema = z.object({
  status: statusSchema,
});

export const listManagedUsersSchema = z.object({
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  ...paginationSchema,
});

export const listAdminCampaignsSchema = z.object({
  status: campaignStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  ...paginationSchema,
});

export const updateCampaignStatusSchema = z.object({
  status: campaignStatusSchema,
});

export const listAdminApplicationsSchema = z.object({
  status: applicationStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  ...paginationSchema,
});

export const updateApplicationStatusSchema = z.object({
  status: applicationStatusSchema,
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
