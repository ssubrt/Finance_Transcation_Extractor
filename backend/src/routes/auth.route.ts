import { Hono } from "hono"
import { prisma } from "../lib/db.js"
import bcryptjs from "bcryptjs"
import jwt from "jsonwebtoken"
import type { AuthContext } from "../middleware/auth.middleware.js"

type Variables = {
  auth: AuthContext
}

const router = new Hono<{ Variables: Variables }>()

interface RegisterBody {
  email: string
  password: string
  name?: string
}

interface LoginBody {
  email: string
  password: string
}

router.post("/register", async (c) => {
  try {
    const body = (await c.req.json()) as RegisterBody

    if (!body.email || !body.password) {
      return c.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (existingUser) {
      return c.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(body.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name || body.email.split("@")[0],
        password: hashedPassword,
      },
    })

    // Create default organization
    const organization = await prisma.organization.create({
      data: {
        name: `${user.name}'s Workspace`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    })

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        organizationId: organization.id,
      },
      process.env.BETTER_AUTH_SECRET || "secret",
      { expiresIn: "7d" },
    )

    return c.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        token,
        organizationId: organization.id,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Register error:", error)
    return c.json({ error: "Failed to register" }, { status: 500 })
  }
})

router.post("/login", async (c) => {
  try {
    const body = (await c.req.json()) as LoginBody

    if (!body.email || !body.password) {
      return c.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    })

    if (!user) {
      return c.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(body.password, user.password)
    if (!isValidPassword) {
      return c.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const organization = user.organizations[0]?.organization

    if (!organization) {
      return c.json({ error: "No organization found" }, { status: 400 })
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        organizationId: organization.id,
      },
      process.env.BETTER_AUTH_SECRET || "secret",
      { expiresIn: "7d" },
    )

    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      organizationId: organization.id,
    })
  } catch (error) {
    console.error("Login error:", error)
    return c.json({ error: "Failed to login" }, { status: 500 })
  }
})

router.get("/me", async (c) => {
  const auth = c.get("auth")

  if (!auth) {
    return c.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return c.json({ user })
  } catch (error) {
    return c.json({ error: "Failed to fetch user" }, { status: 500 })
  }
})

export { router as authRoutes }
