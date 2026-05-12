import { prisma } from "../../db/client.js";
import { Prisma, type AppStatus, type CampaignStatus, type Role, type Status } from "@prisma/client";

export type ListUsersInput = { 
  role?: "CREATOR" | "BRAND" | "ORGANISER" | "ADMIN"; 
  status?: Status; 
  search?: string;
  page: number; 
  limit: number 
};
export type ListRegistrationsInput = {
  role: "CREATOR" | "BRAND" | "ORGANISER";
  search?: string;
  page: number;
  limit: number;
};
export type UpdateUserStatusInput = { status: Status };
export type SendAdminMessageInput = { body: string };
export type ListManagedUsersInput = ListUsersInput;
export type ListAdminCampaignsInput = {
  status?: CampaignStatus;
  search?: string;
  page: number;
  limit: number;
};
export type UpdateCampaignStatusInput = { status: CampaignStatus };
export type ListAdminApplicationsInput = {
  status?: AppStatus;
  search?: string;
  page: number;
  limit: number;
};
export type UpdateApplicationStatusInput = { status: AppStatus };
export type ResolveDisputeInput = { action: "release" | "refund" };
export type ListMessageAuditInput = {
  applicationId?: string;
  userId?: string;
  page: number;
  limit: number;
};

function auditUserName(user: any) {
  return (
    user?.creatorProfile?.displayName ||
    user?.brandProfile?.companyName ||
    user?.brandProfile?.founderName ||
    user?.organiserProfile?.orgName ||
    user?.organiserProfile?.contactName ||
    user?.email?.split("@")?.[0] ||
    "User"
  );
}

function startOfDay(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

type MetricRow = {
  totalUsers: number;
  usersToday: number;
  creatorProfiles: number;
  brandProfiles: number;
  organiserProfiles: number;
  totalWaitlist: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalApplications: number;
  acceptedApplications: number;
  totalMessages: number;
  totalDirectMessages: number;
  totalTeamMembers: number;
  pendingTeamMembers: number;
  escrowRecords: number;
  escrowValue: Prisma.Decimal | number | string | null;
  totalTraffic: number;
  trafficToday: number;
  trafficLast7: number;
  uniqueVisitorsLast7: number;
};

type DailyTrafficRow = { date: string; visits: number };
type DailyRegistrationRow = { date: string; registrations: number };
type RoleCountRow = { role: Role; value?: number; _count?: true | { _all?: number } };
type StatusCountRow = { status: Status; value?: number; _count?: true | { _all?: number } };
type TopPathRow = { path: string; visits: number };

function toNumber(value: unknown) {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value || 0);
}

function dayKey(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function buildDailyRows(days: number, trafficRows: DailyTrafficRow[], userRows: DailyRegistrationRow[]) {
  const today = startOfDay();
  const start = addDays(today, -(days - 1));
  const rows = Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: dayKey(date),
      label: date.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      visits: 0,
      registrations: 0,
    };
  });
  const byDate = new Map(rows.map((row) => [row.date, row]));

  for (const event of trafficRows) {
    const row = byDate.get(dayKey(event.date));
    if (row) row.visits += toNumber(event.visits);
  }
  for (const user of userRows) {
    const row = byDate.get(dayKey(user.date));
    if (row) row.registrations += toNumber(user.registrations);
  }

  return rows;
}

function profileDisplayName(user: any) {
  return (
    user.creatorProfile?.displayName ||
    user.brandProfile?.companyName ||
    user.organiserProfile?.orgName ||
    user.email.split("@")[0]
  );
}

function accountLifecycleStatus(status: Status) {
  if (status === "VERIFIED") return "ACTIVE";
  if (status === "SUSPENDED") return "BLOCKED";
  return "PENDING";
}

function loginHistoryRow(event: any) {
  return {
    id: event.id,
    email: event.email,
    success: event.success,
    failureReason: event.failureReason,
    ip: event.ip,
    userAgent: event.userAgent,
    createdAt: event.createdAt,
  };
}

function aggregateCount(row: { value?: number; _count?: true | { _all?: number } }) {
  if (typeof row.value !== "undefined") return toNumber(row.value);
  return typeof row._count === "object" ? Number(row._count._all || 0) : 0;
}

function countByRole(rows: RoleCountRow[]) {
  const counts = { CREATOR: 0, BRAND: 0, ORGANISER: 0, ADMIN: 0 };
  for (const row of rows) counts[row.role] = aggregateCount(row);
  return counts;
}

function countByStatus(rows: StatusCountRow[]) {
  const counts = { PENDING: 0, VERIFIED: 0, SUSPENDED: 0 };
  for (const row of rows) counts[row.status] = aggregateCount(row);
  return counts;
}

async function runInBatches<T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  batchSize: number
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results: unknown[] = [];
  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = tasks.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map((task) => task()))));
  }
  return results as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

export async function getAdminOverview() {
  const today = startOfDay();
  const sevenDaysAgo = addDays(today, -6);
  const thirtyDaysAgo = addDays(today, -29);

  const [
    metricRows,
    roleRows,
    statusRows,
    trafficRows,
    userRows,
    topPathRows,
    recentUsers,
    recentMessages,
    recentCampaigns,
    recentApplications,
  ] = await runInBatches([
    () => prisma.$queryRaw<MetricRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::int FROM "User") AS "totalUsers",
        (SELECT COUNT(*)::int FROM "User" WHERE "createdAt" >= ${today}) AS "usersToday",
        (SELECT COUNT(*)::int FROM "CreatorProfile") AS "creatorProfiles",
        (SELECT COUNT(*)::int FROM "BrandProfile") AS "brandProfiles",
        (SELECT COUNT(*)::int FROM "OrganiserProfile") AS "organiserProfiles",
        (SELECT COUNT(*)::int FROM "Waitlist") AS "totalWaitlist",
        (SELECT COUNT(*)::int FROM "Campaign") AS "totalCampaigns",
        (SELECT COUNT(*)::int FROM "Campaign" WHERE "status" = 'ACTIVE'::"CampaignStatus") AS "activeCampaigns",
        (SELECT COUNT(*)::int FROM "Application") AS "totalApplications",
        (SELECT COUNT(*)::int FROM "Application" WHERE "status" = 'ACCEPTED'::"AppStatus") AS "acceptedApplications",
        (SELECT COUNT(*)::int FROM "Message") AS "totalMessages",
        (SELECT COUNT(*)::int FROM "Message" WHERE "applicationId" IS NULL) AS "totalDirectMessages",
        (SELECT COUNT(*)::int FROM "TeamMember") AS "totalTeamMembers",
        (SELECT COUNT(*)::int FROM "TeamMember" WHERE "status" = 'PENDING') AS "pendingTeamMembers",
        (SELECT COUNT(*)::int FROM "Escrow") AS "escrowRecords",
        (SELECT COALESCE(SUM("amount"), 0)::numeric FROM "Escrow") AS "escrowValue",
        (SELECT COUNT(*)::int FROM "TrafficEvent") AS "totalTraffic",
        (SELECT COUNT(*)::int FROM "TrafficEvent" WHERE "createdAt" >= ${today}) AS "trafficToday",
        (SELECT COUNT(*)::int FROM "TrafficEvent" WHERE "createdAt" >= ${sevenDaysAgo}) AS "trafficLast7",
        (SELECT COUNT(DISTINCT "sessionId")::int FROM "TrafficEvent" WHERE "createdAt" >= ${sevenDaysAgo} AND "sessionId" IS NOT NULL) AS "uniqueVisitorsLast7"
    `),
    () => prisma.$queryRaw<RoleCountRow[]>(Prisma.sql`
      SELECT "role", COUNT(*)::int AS "value"
      FROM "User"
      GROUP BY "role"
      ORDER BY "role" ASC
    `),
    () => prisma.$queryRaw<StatusCountRow[]>(Prisma.sql`
      SELECT "status", COUNT(*)::int AS "value"
      FROM "User"
      GROUP BY "status"
      ORDER BY "status" ASC
    `),
    () => prisma.$queryRaw<DailyTrafficRow[]>(Prisma.sql`
      SELECT TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') AS "date", COUNT(*)::int AS "visits"
      FROM "TrafficEvent"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `),
    () => prisma.$queryRaw<DailyRegistrationRow[]>(Prisma.sql`
      SELECT TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') AS "date", COUNT(*)::int AS "registrations"
      FROM "User"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `),
    () => prisma.$queryRaw<TopPathRow[]>(Prisma.sql`
      SELECT "path", COUNT(*)::int AS "visits"
      FROM "TrafficEvent"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY "path"
      ORDER BY "visits" DESC
      LIMIT 8
    `),
    () => prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        creatorProfile: true,
        brandProfile: true,
        organiserProfile: true,
      },
    }),
    () => prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        sender: {
          include: {
            creatorProfile: true,
            brandProfile: true,
            organiserProfile: true,
          },
        },
      },
    }),
    () => prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { brand: { include: { brandProfile: true, organiserProfile: true } } },
    }),
    () => prisma.application.findMany({
      orderBy: { appliedAt: "desc" },
      take: 6,
      include: {
        creator: { include: { creatorProfile: true } },
        campaign: true,
      },
    }),
  ] as const, 4);

  const metrics = metricRows[0] || {
    totalUsers: 0,
    usersToday: 0,
    creatorProfiles: 0,
    brandProfiles: 0,
    organiserProfiles: 0,
    totalWaitlist: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalApplications: 0,
    acceptedApplications: 0,
    totalMessages: 0,
    totalDirectMessages: 0,
    totalTeamMembers: 0,
    pendingTeamMembers: 0,
    escrowRecords: 0,
    escrowValue: 0,
    totalTraffic: 0,
    trafficToday: 0,
    trafficLast7: 0,
    uniqueVisitorsLast7: 0,
  };
  const roles = countByRole(roleRows);
  const statuses = countByStatus(statusRows);
  const daily = buildDailyRows(30, trafficRows, userRows);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users: toNumber(metrics.totalUsers),
      usersToday: toNumber(metrics.usersToday),
      creators: roles.CREATOR,
      brands: roles.BRAND,
      organisers: roles.ORGANISER,
      admins: roles.ADMIN,
      creatorProfiles: toNumber(metrics.creatorProfiles),
      brandProfiles: toNumber(metrics.brandProfiles),
      organiserProfiles: toNumber(metrics.organiserProfiles),
      waitlist: toNumber(metrics.totalWaitlist),
      campaigns: toNumber(metrics.totalCampaigns),
      activeCampaigns: toNumber(metrics.activeCampaigns),
      applications: toNumber(metrics.totalApplications),
      acceptedApplications: toNumber(metrics.acceptedApplications),
      messages: toNumber(metrics.totalMessages),
      directMessages: toNumber(metrics.totalDirectMessages),
      teamMembers: toNumber(metrics.totalTeamMembers),
      pendingTeamMembers: toNumber(metrics.pendingTeamMembers),
      escrowRecords: toNumber(metrics.escrowRecords),
      escrowValue: toNumber(metrics.escrowValue),
      traffic: toNumber(metrics.totalTraffic),
      trafficToday: toNumber(metrics.trafficToday),
      trafficLast7: toNumber(metrics.trafficLast7),
      uniqueVisitorsLast7: toNumber(metrics.uniqueVisitorsLast7),
    },
    roleBreakdown: [
      { name: "Creators", value: roles.CREATOR },
      { name: "Brands", value: roles.BRAND },
      { name: "Event organisers", value: roles.ORGANISER },
      { name: "Admins", value: roles.ADMIN },
    ],
    statusBreakdown: [
      { name: "Pending", value: statuses.PENDING },
      { name: "Verified", value: statuses.VERIFIED },
      { name: "Suspended", value: statuses.SUSPENDED },
    ],
    daily,
    topPaths: topPathRows.map((row) => ({
      path: row.path,
      visits: toNumber(row.visits),
    })),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      name: profileDisplayName(user),
      createdAt: user.createdAt,
    })),
    recentActivity: [
      ...recentUsers.slice(0, 4).map((user) => ({
        id: `user-${user.id}`,
        type: "Registration",
        title: `${profileDisplayName(user)} joined as ${String(user.role).toLowerCase()}`,
        at: user.createdAt,
      })),
      ...recentCampaigns.slice(0, 4).map((campaign) => ({
        id: `campaign-${campaign.id}`,
        type: "Campaign",
        title: `${campaign.title} created by ${profileDisplayName(campaign.brand)}`,
        at: campaign.createdAt,
      })),
      ...recentApplications.slice(0, 4).map((application) => ({
        id: `application-${application.id}`,
        type: "Application",
        title: `${profileDisplayName(application.creator)} applied to ${application.campaign.title}`,
        at: application.appliedAt,
      })),
      ...recentMessages.slice(0, 4).map((message) => ({
        id: `message-${message.id}`,
        type: "Message",
        title: `${profileDisplayName(message.sender)} sent a message`,
        at: message.createdAt,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 10)
      .map((item) => ({ ...item, at: item.at.toISOString() })),
  };
}

const registrationListSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  creatorProfile: true,
  brandProfile: true,
  organiserProfile: true,
  _count: {
    select: {
      applications: true,
      campaignsAsBrand: true,
      messagesSent: true,
      messagesReceived: true,
      ownedTeamMembers: true,
      notifications: true,
      loginEvents: true,
    },
  },
} satisfies Prisma.UserSelect;

const registrationDetailSelect = {
  ...registrationListSelect,
  onboardingProgress: true,
  applications: {
    orderBy: { appliedAt: "desc" },
    take: 12,
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          category: true,
          location: true,
          status: true,
          budgetMin: true,
          budgetMax: true,
          deadline: true,
          brand: {
            select: {
              id: true,
              email: true,
              brandProfile: { select: { companyName: true, founderName: true } },
              organiserProfile: { select: { orgName: true, contactName: true } },
            },
          },
        },
      },
    },
  },
  campaignsAsBrand: {
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      _count: { select: { applications: true } },
    },
  },
  ownedTeamMembers: {
    orderBy: { invitedAt: "desc" },
    take: 20,
  },
  teamMembership: true,
  messagesSent: {
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      body: true,
      createdAt: true,
      readAt: true,
      recipient: {
        select: {
          id: true,
          email: true,
          role: true,
          creatorProfile: { select: { displayName: true } },
          brandProfile: { select: { companyName: true, founderName: true } },
          organiserProfile: { select: { orgName: true, contactName: true } },
        },
      },
    },
  },
  messagesReceived: {
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      body: true,
      createdAt: true,
      readAt: true,
      sender: {
        select: {
          id: true,
          email: true,
          role: true,
          creatorProfile: { select: { displayName: true } },
          brandProfile: { select: { companyName: true, founderName: true } },
          organiserProfile: { select: { orgName: true, contactName: true } },
        },
      },
    },
  },
  notifications: {
    orderBy: { createdAt: "desc" },
    take: 12,
  },
  loginEvents: {
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      email: true,
      success: true,
      failureReason: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  },
} satisfies Prisma.UserSelect;

function registrationSearchWhere(role: ListRegistrationsInput["role"], search?: string): Prisma.UserWhereInput {
  const term = search?.trim();
  const where: Prisma.UserWhereInput = { role };
  if (!term) return where;

  const contains = { contains: term, mode: "insensitive" as const };
  const roleSpecific: Record<ListRegistrationsInput["role"], Prisma.UserWhereInput[]> = {
    CREATOR: [
      { creatorProfile: { is: { displayName: contains } } },
      { creatorProfile: { is: { socialHandle: contains } } },
      { creatorProfile: { is: { niche: contains } } },
      { creatorProfile: { is: { city: contains } } },
      { creatorProfile: { is: { state: contains } } },
    ],
    BRAND: [
      { brandProfile: { is: { companyName: contains } } },
      { brandProfile: { is: { founderName: contains } } },
      { brandProfile: { is: { industry: contains } } },
      { brandProfile: { is: { location: contains } } },
    ],
    ORGANISER: [
      { organiserProfile: { is: { orgName: contains } } },
      { organiserProfile: { is: { contactName: contains } } },
      { organiserProfile: { is: { city: contains } } },
      { organiserProfile: { is: { state: contains } } },
      { organiserProfile: { is: { country: contains } } },
      { organiserProfile: { is: { eventType: contains } } },
    ],
  };

  return {
    ...where,
    OR: [{ email: contains }, ...roleSpecific[role]],
  };
}

function registrationProfile(user: any) {
  if (user.role === "CREATOR") return user.creatorProfile;
  if (user.role === "BRAND") return user.brandProfile;
  if (user.role === "ORGANISER") return user.organiserProfile;
  return null;
}

function registrationSummary(user: any) {
  const profile = registrationProfile(user);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    currentStatus: accountLifecycleStatus(user.status),
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    name: profileDisplayName(user),
    avatarUrl: profile?.avatarUrl || null,
    profile,
    counts: user._count,
  };
}

function managedUsersWhere(input: Pick<ListManagedUsersInput, "role" | "status" | "search">): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (input.role) where.role = input.role as Role;
  if (input.status) where.status = input.status as Status;

  const term = input.search?.trim();
  if (term) {
    const contains = { contains: term, mode: "insensitive" as const };
    where.OR = [
      { email: contains },
      { creatorProfile: { is: { displayName: contains } } },
      { creatorProfile: { is: { socialHandle: contains } } },
      { creatorProfile: { is: { phone: contains } } },
      { brandProfile: { is: { companyName: contains } } },
      { brandProfile: { is: { founderName: contains } } },
      { brandProfile: { is: { phone: contains } } },
      { organiserProfile: { is: { orgName: contains } } },
      { organiserProfile: { is: { contactName: contains } } },
      { organiserProfile: { is: { phone: contains } } },
    ];
  }

  return where;
}

export async function listUsers(input: ListUsersInput, options: { excludeAdmins?: boolean } = {}) {
  const where = managedUsersWhere(input);
  if (options.excludeAdmins) {
    if (input.role === "ADMIN") return { items: [], total: 0, page: input.page, limit: input.limit };
    if (!input.role) where.role = { not: "ADMIN" } as Prisma.EnumRoleFilter;
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        creatorProfile: true,
        brandProfile: true,
        organiserProfile: true,
        _count: {
          select: {
            applications: true,
            campaignsAsBrand: true,
            messagesSent: true,
            messagesReceived: true,
            loginEvents: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items: items.map(registrationSummary), total, page: input.page, limit: input.limit };
}

export async function listRegistrations(input: ListRegistrationsInput) {
  const where = registrationSearchWhere(input.role, input.search);
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      select: registrationListSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    role: input.role,
    items: items.map(registrationSummary),
    total,
    page: input.page,
    limit: input.limit,
  };
}

export async function getRegistrationDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: registrationDetailSelect,
  });

  if (!user || !["CREATOR", "BRAND", "ORGANISER"].includes(user.role)) {
    throw new Error("Registration not found");
  }

  return {
    ...registrationSummary(user),
    onboardingProgress: user.onboardingProgress,
    applications: user.applications,
    campaigns: user.campaignsAsBrand,
    ownedTeamMembers: user.ownedTeamMembers,
    teamMembership: user.teamMembership,
    messagesSent: user.messagesSent,
    messagesReceived: user.messagesReceived,
    notifications: user.notifications,
    loginHistory: (user.loginEvents || []).map(loginHistoryRow),
  };
}

export async function updateUserStatus(userId: string, input: UpdateUserStatusInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!user) throw new Error("User not found");
  if (user.role === "ADMIN" && input.status === "SUSPENDED") {
    throw new Error("Admin users cannot be suspended from the admin dashboard");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: input.status as Status },
    select: registrationListSelect,
  });
  return registrationSummary(updated);
}

export async function listManagedUsers(input: ListManagedUsersInput) {
  return listUsers(input, { excludeAdmins: true });
}

export async function getManagedUserDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: registrationDetailSelect,
  });

  if (!user || user.role === "ADMIN") throw new Error("User not found");

  return {
    ...registrationSummary(user),
    onboardingProgress: user.onboardingProgress,
    applications: user.applications,
    campaigns: user.campaignsAsBrand,
    ownedTeamMembers: user.ownedTeamMembers,
    teamMembership: user.teamMembership,
    messagesSent: user.messagesSent,
    messagesReceived: user.messagesReceived,
    notifications: user.notifications,
    loginHistory: (user.loginEvents || []).map(loginHistoryRow),
  };
}

export async function sendAdminMessage(adminUserId: string, recipientId: string, input: SendAdminMessageInput) {
  if (adminUserId === recipientId) throw new Error("Cannot message yourself");

  const [adminUser, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: adminUserId }, select: { id: true, role: true, email: true } }),
    prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        role: true,
        email: true,
        status: true,
        creatorProfile: { select: { displayName: true, avatarUrl: true } },
        brandProfile: { select: { companyName: true, founderName: true, avatarUrl: true } },
        organiserProfile: { select: { orgName: true, contactName: true, avatarUrl: true } },
      },
    }),
  ]);

  if (!adminUser || adminUser.role !== "ADMIN") throw new Error("Only site admins can send this message");
  if (!recipient || recipient.role === "ADMIN") throw new Error("User not found");

  const messageBody = input.body.trim();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        senderId: adminUserId,
        recipientId,
        body: messageBody,
      },
    });
    await tx.notification.create({
      data: {
        userId: recipientId,
        type: "site_admin_message",
        title: "Message from Site Admin",
        body: messageBody.length > 180 ? `${messageBody.slice(0, 177)}...` : messageBody,
      },
    });
    return created;
  });

  return {
    id: message.id,
    senderId: message.senderId,
    senderName: "Site Admin",
    recipientId: message.recipientId,
    recipientName: profileDisplayName(recipient),
    recipientEmail: recipient.email,
    body: message.body,
    createdAt: message.createdAt,
  };
}

const adminCampaignSelect = {
  id: true,
  brandId: true,
  title: true,
  description: true,
  category: true,
  budgetMin: true,
  budgetMax: true,
  totalSlots: true,
  filledSlots: true,
  location: true,
  platforms: true,
  deliverables: true,
  deadline: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  brand: {
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      brandProfile: { select: { companyName: true, founderName: true, industry: true, phone: true, location: true, avatarUrl: true } },
      organiserProfile: { select: { orgName: true, contactName: true, eventType: true, phone: true, city: true, state: true, avatarUrl: true } },
    },
  },
  _count: {
    select: {
      applications: true,
    },
  },
} satisfies Prisma.CampaignSelect;

const adminCampaignDetailSelect = {
  ...adminCampaignSelect,
  applications: {
    orderBy: { appliedAt: "desc" },
    take: 50,
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          status: true,
          creatorProfile: true,
        },
      },
      contract: {
        include: {
          escrow: true,
          deliverables: true,
          reviews: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  },
} satisfies Prisma.CampaignSelect;

const adminApplicationSelect = {
  id: true,
  campaignId: true,
  creatorId: true,
  status: true,
  proposedRate: true,
  message: true,
  appliedAt: true,
  campaign: {
    select: {
      id: true,
      title: true,
      category: true,
      location: true,
      status: true,
      budgetMin: true,
      budgetMax: true,
      deadline: true,
      totalSlots: true,
      filledSlots: true,
      brand: {
        select: {
          id: true,
          email: true,
          role: true,
          brandProfile: { select: { companyName: true, founderName: true, avatarUrl: true } },
          organiserProfile: { select: { orgName: true, contactName: true, avatarUrl: true } },
        },
      },
    },
  },
  creator: {
    select: {
      id: true,
      email: true,
      status: true,
      creatorProfile: true,
    },
  },
  contract: {
    include: {
      escrow: true,
      deliverables: true,
      reviews: true,
    },
  },
  _count: {
    select: {
      messages: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

function campaignOwnerName(user: any) {
  return user?.brandProfile?.companyName || user?.organiserProfile?.orgName || user?.email?.split("@")?.[0] || "Account";
}

function campaignWhere(input: ListAdminCampaignsInput): Prisma.CampaignWhereInput {
  const where: Prisma.CampaignWhereInput = {};
  if (input.status) where.status = input.status as CampaignStatus;

  const term = input.search?.trim();
  if (term) {
    const contains = { contains: term, mode: "insensitive" as const };
    where.OR = [
      { title: contains },
      { description: contains },
      { category: contains },
      { location: contains },
      { brand: { is: { email: contains } } },
      { brand: { is: { brandProfile: { is: { companyName: contains } } } } },
      { brand: { is: { brandProfile: { is: { founderName: contains } } } } },
      { brand: { is: { organiserProfile: { is: { orgName: contains } } } } },
      { brand: { is: { organiserProfile: { is: { contactName: contains } } } } },
    ];
  }

  return where;
}

function applicationWhere(input: ListAdminApplicationsInput): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = {};
  if (input.status) where.status = input.status as AppStatus;

  const term = input.search?.trim();
  if (term) {
    const contains = { contains: term, mode: "insensitive" as const };
    where.OR = [
      { message: contains },
      { creator: { is: { email: contains } } },
      { creator: { is: { creatorProfile: { is: { displayName: contains } } } } },
      { campaign: { is: { title: contains } } },
      { campaign: { is: { category: contains } } },
      { campaign: { is: { location: contains } } },
      { campaign: { is: { brand: { is: { email: contains } } } } },
      { campaign: { is: { brand: { is: { brandProfile: { is: { companyName: contains } } } } } } },
      { campaign: { is: { brand: { is: { organiserProfile: { is: { orgName: contains } } } } } } },
    ];
  }

  return where;
}

function campaignSummary(campaign: any) {
  return {
    ...campaign,
    ownerName: campaignOwnerName(campaign.brand),
    ownerEmail: campaign.brand?.email || null,
    applicationsCount: campaign._count?.applications || 0,
  };
}

function applicationSummary(application: any) {
  return {
    ...application,
    creatorName: profileDisplayName(application.creator),
    creatorEmail: application.creator?.email || null,
    ownerName: campaignOwnerName(application.campaign?.brand),
    ownerEmail: application.campaign?.brand?.email || null,
    messagesCount: application._count?.messages || 0,
  };
}

export async function listAdminCampaigns(input: ListAdminCampaignsInput) {
  const where = campaignWhere(input);
  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      select: adminCampaignSelect,
    }),
    prisma.campaign.count({ where }),
  ]);

  return { items: items.map(campaignSummary), total, page: input.page, limit: input.limit };
}

export async function getAdminCampaignDetails(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: adminCampaignDetailSelect,
  });
  if (!campaign) throw new Error("Campaign not found");
  return {
    ...campaignSummary(campaign),
    applications: campaign.applications.map(applicationSummary),
  };
}

export async function updateCampaignStatus(campaignId: string, input: UpdateCampaignStatusInput) {
  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: input.status as CampaignStatus },
    select: adminCampaignSelect,
  });
  return campaignSummary(campaign);
}

export async function listAdminApplications(input: ListAdminApplicationsInput) {
  const where = applicationWhere(input);
  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { appliedAt: "desc" },
      select: adminApplicationSelect,
    }),
    prisma.application.count({ where }),
  ]);

  return { items: items.map(applicationSummary), total, page: input.page, limit: input.limit };
}

export async function getAdminApplicationDetails(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: adminApplicationSelect,
  });
  if (!application) throw new Error("Application not found");
  return applicationSummary(application);
}

export async function updateApplicationStatus(applicationId: string, input: UpdateApplicationStatusInput) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { campaign: true },
  });
  if (!application) throw new Error("Application not found");

  const status = input.status as AppStatus;
  if (status === "ACCEPTED" && application.status !== "ACCEPTED") {
    const acceptedCount = await prisma.application.count({
      where: { campaignId: application.campaignId, status: "ACCEPTED" },
    });
    if (acceptedCount >= application.campaign.totalSlots) throw new Error("No slots left");
  }

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status },
    });

    const acceptedCount = await tx.application.count({
      where: { campaignId: application.campaignId, status: "ACCEPTED" },
    });
    await tx.campaign.update({
      where: { id: application.campaignId },
      data: { filledSlots: Math.min(acceptedCount, application.campaign.totalSlots) },
    });

    if (application.status !== status) {
      await tx.notification.create({
        data: {
          userId: application.creatorId,
          type: "application_status_updated",
          title: `Application ${status.toLowerCase()}`,
          body: `Your application for ${application.campaign.title} was ${status.toLowerCase()} by SynkSpace admin.`,
        },
      });
    }
  });

  return getAdminApplicationDetails(applicationId);
}

export async function listDisputes() {
  const escrows = await prisma.escrow.findMany({
    where: { status: "HELD" },
    include: {
      contract: {
        include: {
          application: { include: { campaign: true } },
          creator: { select: { id: true, creatorProfile: true } },
        },
      },
    },
  });
  return escrows;
}

export async function listMessageAudit(input: ListMessageAuditInput) {
  const where = {
    ...(input.applicationId ? { applicationId: input.applicationId } : {}),
    ...(input.userId ? { OR: [{ senderId: input.userId }, { recipientId: input.userId }] } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.message.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            creatorProfile: { select: { displayName: true } },
            brandProfile: { select: { companyName: true, founderName: true } },
            organiserProfile: { select: { orgName: true, contactName: true } },
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            role: true,
            creatorProfile: { select: { displayName: true } },
            brandProfile: { select: { companyName: true, founderName: true } },
            organiserProfile: { select: { orgName: true, contactName: true } },
          },
        },
        application: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                brandId: true,
              },
            },
            creator: {
              select: {
                id: true,
                email: true,
                creatorProfile: { select: { displayName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.message.count({ where }),
  ]);

  return {
    items: items.map((message) => ({
      id: message.id,
      applicationId: message.applicationId,
      campaignId: message.application?.campaignId || null,
      campaignTitle: message.application?.campaign.title || "Direct message",
      senderId: message.senderId,
      senderEmail: message.sender.email,
      senderRole: message.sender.role,
      senderName: auditUserName(message.sender),
      recipientId: message.recipientId,
      recipientEmail: message.recipient?.email || null,
      recipientRole: message.recipient?.role || null,
      recipientName: message.recipient ? auditUserName(message.recipient) : null,
      creatorId: message.application?.creatorId || (message.recipient?.role === "CREATOR" ? message.recipient.id : message.sender.role === "CREATOR" ? message.sender.id : null),
      creatorEmail: message.application?.creator.email || (message.recipient?.role === "CREATOR" ? message.recipient.email : message.sender.role === "CREATOR" ? message.sender.email : null),
      creatorName: message.application?.creator.creatorProfile?.displayName || (message.recipient?.role === "CREATOR" ? auditUserName(message.recipient) : message.sender.role === "CREATOR" ? auditUserName(message.sender) : null),
      brandId: message.application?.campaign.brandId || null,
      body: message.body,
      readAt: message.readAt,
      createdAt: message.createdAt,
    })),
    total,
    page: input.page,
    limit: input.limit,
  };
}

export async function resolveDispute(escrowId: string, adminUserId: string, input: ResolveDisputeInput) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
    include: { contract: true },
  });
  if (!escrow || escrow.status !== "HELD") {
    throw new Error("Escrow not found or not in HELD state");
  }
  const escrowModule = await import("../escrow/escrow.service.js");
  if (input.action === "release") {
    await escrowModule.releaseEscrow(escrowId, adminUserId);
  } else {
    await escrowModule.refundEscrow(escrowId, adminUserId);
  }
  return prisma.escrow.findUnique({ where: { id: escrowId } });
}

export async function exportWaitlistCsv(): Promise<string> {
  const rows = await prisma.waitlist.findMany({
    orderBy: { createdAt: "asc" },
  });
  const header = "email,role,name,createdAt\n";
  // FIX: Added (r: any) to satisfy TS7006
  const lines = rows.map(
    (r: any) => `${r.email},${r.role},${r.name ?? ""},${r.createdAt.toISOString()}`
  );
  return header + lines.join("\n");
}
