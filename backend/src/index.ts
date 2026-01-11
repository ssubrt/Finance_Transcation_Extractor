import { Hono } from "hono"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"
import { authRoutes } from "./routes/auth.route"
import { transactionRoutes } from "./routes/transaction.route"

const app = new Hono()

// Middleware
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Routes
app.route("/api/auth", authRoutes)
app.route("/api/transactions", transactionRoutes)

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" })
})

// Error handling
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || "Internal Server Error" }, { status: 500 })
})

const port = Number.parseInt(process.env.HONO_PORT || "3001")

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server running on http://localhost:${port}`)
