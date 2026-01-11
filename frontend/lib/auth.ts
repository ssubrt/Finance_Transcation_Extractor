import { hash, verify } from "@node-rs/argon2"
import { cookies } from "next/headers"
import { jwtVerify, SignJWT, type JWTPayload } from "jose"

const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET || "dev-secret-key-minimum-32-characters-long")

export interface AuthPayload extends JWTPayload {
  userId: string
  organizationId: string
  email: string
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verify(hash, password)
}

export async function createJWT(payload: Omit<AuthPayload, "iat" | "exp">): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret)

  return token
}

export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const verified = await jwtVerify(token, secret)
    return verified.payload as AuthPayload
  } catch {
    return null
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  })
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("auth-token")?.value || null
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
}

export async function getAuthFromRequest(request: Request): Promise<AuthPayload | null> {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.slice(7)
  return verifyJWT(token)
}
