import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSessionSecret } from "@/lib/env";

const COOKIE_NAME = "zelo_session";
const SESSION_DAYS = 3;

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function createToken(userId: string) {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const nonce = randomBytes(18).toString("base64url");
  const payload = `${userId}.${expiresAt}.${nonce}`;

  return `${payload}.${sign(payload)}`;
}

function readToken(token?: string) {
  if (!token) {
    return null;
  }

  const [userId, expiresAt, nonce, signature] = token.split(".");

  if (!userId || !expiresAt || !nonce || !signature) {
    return null;
  }

  const expiresAtNumber = Number(expiresAt);

  if (!Number.isFinite(expiresAtNumber) || expiresAtNumber <= Date.now()) {
    return null;
  }

  const payload = `${userId}.${expiresAt}.${nonce}`;
  const expected = Buffer.from(sign(payload), "hex");
  const received = Buffer.from(signature, "hex");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  return userId;
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  cookieStore.set(COOKIE_NAME, createToken(userId), {
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
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = readToken(cookieStore.get(COOKIE_NAME)?.value);

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      company: {
        isActive: true,
      },
    },
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
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
