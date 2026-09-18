import type { Metadata } from "next";
import { db } from "@/lib/db";
import { isShareExpired, viewsRemaining } from "@/lib/share-helpers";
import { parseDateLocal } from "@/lib/format";
import type {
  CategoryBreakdown,
  ShareLink,
  ShareComment,
  Transaction,
  TransactionType,
} from "@/lib/types";
import { SharePageClient } from "./share-page-client";
import { ShareAuthGate } from "./share-auth-gate";
import { ShareNotFound, ShareExpired } from "./share-states";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

// ---------------------------------------------------------------------------
// Metadata — uses the share link's title + message so previews look good
// when this link is shared in chat apps / social media.
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { token } = await params;
  const link = await db.shareLink.findUnique({
    where: { token },
    select: { title: true, message: true, active: true },
  });
  if (!link || !link.active) {
    return { title: "Link tidak ditemukan — DompetKu" };
  }
  return {
    title: `${link.title} — DompetKu`,
    description: link.message ?? `Data keuangan dibagikan via DompetKu: ${link.title}`,
    openGraph: {
      title: `${link.title} — DompetKu`,
      description: link.message ?? "Data keuangan dibagikan via DompetKu.",
      siteName: "DompetKu",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page — Server Component
// ---------------------------------------------------------------------------
export default async function SharePage({ params }: { params: Params }) {
  const { token } = await params;

  const link = await db.shareLink.findUnique({
    where: { token },
    include: {
      _count: { select: { views: true, comments: true } },
    },
  });

  // 1) Not found / inactive
  if (!link || !link.active) {
    return <ShareNotFound />;
  }

  // 2) Expired
  const expiry = isShareExpired({
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    hoursActive: link.hoursActive,
    createdAt: link.createdAt.toISOString(),
    maxViews: link.maxViews,
    viewCount: link.viewCount,
    oneTime: link.oneTime,
  });
  if (expiry.expired) {
    return <ShareExpired reason={expiry.reason ?? "Link sudah kadaluarsa."} />;
  }

  // 3) Auth gate — password
  if (link.passwordHash) {
    return <ShareAuthGate token={token} mode="password" />;
  }

  // 4) Auth gate — email verification
  if (link.requireEmail) {
    return (
      <ShareAuthGate
        token={token}
        mode="email"
        emailHint={link.requireEmail}
      />
    );
  }

  // 5) Public — fetch data + comments + render the main view
  const [data, comments] = await Promise.all([
    fetchShareData(link),
    fetchShareComments(link.id),
  ]);

  // Strip sensitive fields
  const { passwordHash: _ph, ...sanitizedLink } = link;
  const serializedLink: ShareLink = {
    ...sanitizedLink,
    // Sensitive: never expose passwordHash to the client (always null in
    // serialized form). Required by the ShareLink type.
    passwordHash: null,
    // Prisma returns enums as plain `string`; narrow back to the union type.
    accessLevel: sanitizedLink.accessLevel as ShareLink["accessLevel"],
    scopeType: sanitizedLink.scopeType as ShareLink["scopeType"],
    expiresAt: sanitizedLink.expiresAt
      ? sanitizedLink.expiresAt.toISOString()
      : null,
    createdAt: sanitizedLink.createdAt.toISOString(),
    updatedAt: sanitizedLink.updatedAt.toISOString(),
  };

  return (
    <SharePageClient
      token={token}
      link={serializedLink}
      data={data}
      comments={comments}
      viewsRemaining={viewsRemaining({
        maxViews: link.maxViews,
        viewCount: link.viewCount,
      })}
      viewCount={link._count?.views ?? link.viewCount}
    />
  );
}

// ---------------------------------------------------------------------------
// fetchShareData — mirrors the logic in /api/shares/[token]/data but returns
// the typed object directly (no JSON wrapping).
// ---------------------------------------------------------------------------
type ShareLinkDb = {
  id: string;
  token: string;
  scopeType: string;
  scopeData: string | null;
  hiddenAmounts: boolean;
  maskedDesc: boolean;
};

type ShareData = {
  transactions: Transaction[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    count: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  expired: boolean;
};

async function fetchShareData(link: ShareLinkDb): Promise<ShareData> {
  // Parse scopeData
  let scope: Record<string, unknown> = {};
  if (link.scopeData) {
    try {
      scope = JSON.parse(link.scopeData);
    } catch {
      scope = {};
    }
  }

  // Build Prisma where filter based on scopeType
  const where: Record<string, unknown> = { status: { not: "DRAFT" } };

  switch (link.scopeType) {
    case "ALL":
      break;
    case "ACCOUNT": {
      const accountId =
        (scope.accountId as string | undefined) ??
        (scope.accountIds as string[] | undefined)?.[0];
      if (accountId) where.accountId = accountId;
      break;
    }
    case "CATEGORY": {
      const categoryId =
        (scope.categoryId as string | undefined) ??
        (scope.categoryIds as string[] | undefined)?.[0];
      if (categoryId) where.categoryId = categoryId;
      break;
    }
    case "GROUP": {
      const groupId =
        (scope.groupId as string | undefined) ??
        (scope.groupIds as string[] | undefined)?.[0];
      if (groupId) where.groupId = groupId;
      break;
    }
    case "TAG": {
      const tag = scope.tag as string | undefined;
      const tags = scope.tags as string[] | undefined;
      if (tag) {
        where.tags = { contains: tag };
      } else if (Array.isArray(tags) && tags.length > 0) {
        where.OR = tags.map((t) => ({ tags: { contains: t } }));
      }
      break;
    }
    case "DATE_RANGE": {
      const dateFilter: Record<string, Date> = {};
      const from = scope.from as string | undefined;
      const to = scope.to as string | undefined;
      if (from) dateFilter.gte = parseDateLocal(from);
      if (to) {
        const t = parseDateLocal(to);
        t.setHours(23, 59, 59, 999);
        dateFilter.lte = t;
      }
      if (dateFilter.gte || dateFilter.lte) where.date = dateFilter;
      break;
    }
    case "CUSTOM": {
      const txIds = scope.txIds as string[] | undefined;
      if (Array.isArray(txIds) && txIds.length > 0) {
        where.id = { in: txIds };
      } else {
        where.id = { in: [] };
      }
      break;
    }
    default:
      break;
  }

  const txs = await db.transaction.findMany({
    where,
    include: { category: true, account: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // Apply privacy masks
  const sanitizedTxs = txs.map((t) => {
    const maskedDescription =
      link.maskedDesc && t.description
        ? t.description.length > 10
          ? `${t.description.slice(0, 10)}...`
          : `${t.description}...`
        : t.description;
    return {
      ...t,
      amount: link.hiddenAmounts ? null : t.amount,
      originalAmount: link.hiddenAmounts ? null : t.originalAmount,
      cashbackAmount: link.hiddenAmounts ? null : t.cashbackAmount,
      originalPrice: link.hiddenAmounts ? null : t.originalPrice,
      discountAmount: link.hiddenAmounts ? null : t.discountAmount,
      description: maskedDescription,
      note: link.maskedDesc && t.note ? "***" : t.note,
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    } as unknown as Transaction;
  }) as Transaction[];

  // Summary (uses real amounts; only display masked)
  const totalIncome = txs
    .filter((t) => t.type === ("INCOME" as TransactionType))
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs
    .filter((t) => t.type === ("EXPENSE" as TransactionType))
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Category breakdown
  const catMap = new Map<
    string,
    {
      total: number;
      count: number;
      category: NonNullable<(typeof txs)[number]["category"]>;
    }
  >();
  for (const t of txs) {
    if (!t.category) continue;
    const existing = catMap.get(t.categoryId);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    } else {
      catMap.set(t.categoryId, {
        total: t.amount,
        count: 1,
        category: t.category,
      });
    }
  }
  const grandTotal = Array.from(catMap.values()).reduce(
    (s, v) => s + v.total,
    0,
  );
  const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.values())
    .map((v) => ({
      category: v.category as unknown as CategoryBreakdown["category"],
      total: link.hiddenAmounts ? 0 : v.total,
      count: v.count,
      percentage: grandTotal > 0 ? (v.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    transactions: sanitizedTxs,
    summary: {
      totalIncome: link.hiddenAmounts ? 0 : totalIncome,
      totalExpense: link.hiddenAmounts ? 0 : totalExpense,
      balance: link.hiddenAmounts ? 0 : balance,
      count: txs.length,
    },
    categoryBreakdown,
    expired: false,
  };
}

async function fetchShareComments(shareLinkId: string): Promise<ShareComment[]> {
  const rows = await db.shareComment.findMany({
    where: { shareLinkId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      transactionId: true,
      author: true,
      content: true,
      isPinned: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}
