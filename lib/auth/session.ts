import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSessionSecret } from "@/lib/env";

const COOKIE_NAME = "zelo_session";
const SESSION_DAYS = 3;

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createCookieValue(sessionId: string, verifier: string) {
  const payload = `${sessionId}.${verifier}`;

  return `${payload}.${sign(payload)}`;
}

function readToken(token?: string) {
  if (!token) {
    return null;
  }

  const [sessionId, verifier, signature] = token.split(".");

  if (!sessionId || !verifier || !signature) {
    return null;
  }

  const payload = `${sessionId}.${verifier}`;
  const expected = Buffer.from(sign(payload), "hex");
  const received = Buffer.from(signature, "hex");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  return {
    sessionId,
    verifier,
  };
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const verifier = randomBytes(32).toString("base64url");
  const now = new Date();

  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      revokedAt: now,
    },
  });

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(verifier),
      expiresAt: expires,
    },
    select: {
      id: true,
    },
  });

  cookieStore.set(COOKIE_NAME, createCookieValue(session.id, verifier), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = readToken(cookieStore.get(COOKIE_NAME)?.value);

  if (token) {
    await prisma.session.updateMany({
      where: {
        id: token.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = readToken(cookieStore.get(COOKIE_NAME)?.value);

  if (!token) {
    return null;
  }

  const session = await prisma.session.findFirst({
    where: {
      id: token.sessionId,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          company: {
            include: {
              subscriptions: {
                where: {
                  status: "ACTIVE",
                  currentPeriodEnd: {
                    gte: new Date(),
                  },
                },
                include: {
                  plan: true,
                },
                orderBy: {
                  currentPeriodEnd: "desc",
                },
                take: 1,
              },
            },
          },
          department: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const expectedHash = Buffer.from(session.tokenHash);
  const receivedHash = Buffer.from(hashToken(token.verifier));

  if (expectedHash.length !== receivedHash.length || !timingSafeEqual(expectedHash, receivedHash)) {
    await prisma.session.updateMany({
      where: {
        id: token.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return null;
  }

  if (!session.user.isActive || !session.user.company.isActive) {
    return null;
  }

  return session.user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
