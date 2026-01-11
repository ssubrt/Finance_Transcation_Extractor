import type { Context, Next } from "hono"
import jwt from "jsonwebtoken"

export interface AuthContext {
  userId: string
  email: string
  organizationId: string
}

type Variables = {
  auth: AuthContext
}

export async function authMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const authHeader = c.req.header("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, process.env.BETTER_AUTH_SECRET || "secret") as AuthContext
    c.set("auth", decoded)
    await next()
  } catch (error) {
    return c.json({ error: "Invalid token" }, { status: 401 })
  }
}
