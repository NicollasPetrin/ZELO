import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 5;

export async function GET() {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        responseTimeMs: Math.round(performance.now() - startedAt),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unreachable",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
