import { db } from "@/lib/db";

export async function getDashboardOverview(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [todaysCalls, followUps, interestedLeads, proposalsDue, recentlyDiscovered] = await Promise.all([
    db.lead.findMany({
      where: {
        userId,
        OR: [{ status: "CALL_TODAY" }, { nextActionAt: { gte: startOfDay, lt: endOfDay } }],
      },
      include: { business: { include: { locations: { where: { isPrimary: true }, take: 1 }, leadScores: { orderBy: { computedAt: "desc" }, take: 1 } } } },
      orderBy: { nextActionAt: "asc" },
      take: 20,
    }),
    db.followUp.findMany({
      where: { userId, completed: false, dueAt: { gte: now } },
      include: { lead: { include: { business: true } } },
      orderBy: { dueAt: "asc" },
      take: 10,
    }),
    db.lead.findMany({
      where: { userId, status: "INTERESTED" },
      include: { business: { include: { leadScores: { orderBy: { computedAt: "desc" }, take: 1 } } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.proposal.findMany({
      where: { userId, status: { in: ["DRAFT", "SENT"] } },
      include: { lead: { include: { business: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.business.findMany({
      where: { searchResults: { some: { search: { userId }, createdAt: { gte: sevenDaysAgo } } }, leads: { none: { userId } } },
      include: { locations: { where: { isPrimary: true }, take: 1 }, leadScores: { orderBy: { computedAt: "desc" }, take: 1 }, website: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return { todaysCalls, followUps, interestedLeads, proposalsDue, recentlyDiscovered };
}
