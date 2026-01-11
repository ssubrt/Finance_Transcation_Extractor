import { Hono } from "hono"
import { prisma } from "../lib/db.js"
import { authMiddleware, type AuthContext } from "../middleware/auth.middleware.js"

type Variables = {
  auth: AuthContext
}

const router = new Hono<{ Variables: Variables }>()

interface ExtractBody {
  text: string
}

interface PaginationQuery {
  cursor?: string
  limit?: string
}

router.post("/extract", authMiddleware, async (c) => {
  try {
    const auth = c.get("auth") as AuthContext
    const body = (await c.req.json()) as ExtractBody

    if (!body.text || body.text.trim().length === 0) {
      return c.json({ error: "Text is required" }, { status: 400 })
    }

    // Simple transaction parser - extracts date, description, amount
    const transactions = parseTransactions(body.text)

    if (transactions.length === 0) {
      return c.json({ error: "No transactions found in text" }, { status: 400 })
    }

    // Save transactions to database
    const savedTransactions = await Promise.all(
      transactions.map((txn) =>
        prisma.transaction.create({
          data: {
            userId: auth.userId,
            organizationId: auth.organizationId,
            date: txn.date,
            description: txn.description,
            amount: txn.amount,
            type: txn.type,
            category: txn.category || "other",
            balance: txn.balance || null,
            confidence: txn.confidence,
            rawText: body.text,
          },
        }),
      ),
    )

    return c.json(
      {
        success: true,
        message: `Successfully extracted ${savedTransactions.length} transaction(s)`,
        transactions: savedTransactions,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Extract error:", error)
    return c.json({ error: "Failed to extract transactions" }, { status: 500 })
  }
})

router.get("/", authMiddleware, async (c) => {
  try {
    const auth = c.get("auth") as AuthContext
    const query = c.req.query() as PaginationQuery

    const limit = Math.min(Number.parseInt(query.limit || "10"), 50)
    const cursor = query.cursor

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: auth.userId,
        organizationId: auth.organizationId,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        type: true,
        category: true,
        balance: true,
        confidence: true,
        createdAt: true,
      },
    })

    const hasMore = transactions.length > limit
    const result = transactions.slice(0, limit)
    const nextCursor = hasMore ? result[result.length - 1]?.id : null

    return c.json({
      transactions: result,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("Fetch transactions error:", error)
    return c.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
})

router.delete("/:id", authMiddleware, async (c) => {
  try {
    const auth = c.get("auth") as AuthContext
    const id = c.req.param("id")

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!transaction) {
      return c.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Verify ownership
    if (transaction.userId !== auth.userId || transaction.organizationId !== auth.organizationId) {
      return c.json({ error: "Unauthorized" }, { status: 403 })
    }

    await prisma.transaction.delete({ where: { id } })

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
})

function parseTransactions(text: string): Array<{
  date: Date
  description: string
  amount: number
  type: "debit" | "credit"
  category: string
  balance?: number
  confidence: number
}> {
  const transactions: Array<{
    date: Date
    description: string
    amount: number
    type: "debit" | "credit"
    category: string
    balance?: number
    confidence: number
  }> = []

  // Track processed positions to avoid duplicates
  const processedRanges: Array<[number, number]> = []
  
  const isOverlapping = (start: number, end: number) => {
    return processedRanges.some(([s, e]) => (start >= s && start <= e) || (end >= s && end <= e))
  }

  // Pattern 1: Labeled format "Date: 11 Dec 2025 ... Description: ... Amount: -420.00"
  const pattern1 = /Date:\s*(\d+\s+\w+\s+\d{4}).*?Description:\s*([^\n]+?).*?Amount:\s*([-+]?[\d,]+\.?\d*)/gis
  let match

  while ((match = pattern1.exec(text)) !== null) {
    if (isOverlapping(match.index, match.index + match[0].length)) continue
    processedRanges.push([match.index, match.index + match[0].length])
    
    const dateStr = match[1]
    const description = match[2].trim()
    const amountStr = match[3].replace(/,/g, "")
    const amount = Math.abs(Number.parseFloat(amountStr))
    const balanceMatch = match[0].match(/Balance.*?[:→]?\s*[₹$]?([\d,]+\.?\d*)/i)

    transactions.push({
      date: parseDate(dateStr),
      description,
      amount,
      type: Number.parseFloat(amountStr) < 0 ? "debit" : "credit",
      category: categorizeTransaction(description),
      balance: balanceMatch ? Number.parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      confidence: 0.95,
    })
  }

  // Pattern 2: Uber/Service format with arrow "Uber Ride * Airport Drop 12/11/2025 → ₹1,250.00 debited"
  const pattern2 = /([^\n*]+)\*?\s*([^\n]*?)\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*[→\-:]*\s*[₹$Rs.\s]*([\d,]+\.?\d*)\s*(debited|credited|debit|credit|dr|cr)/gi

  pattern2.lastIndex = 0
  while ((match = pattern2.exec(text)) !== null) {
    if (isOverlapping(match.index, match.index + match[0].length)) continue
    processedRanges.push([match.index, match.index + match[0].length])
    
    const vendor = match[1].trim()
    const description = match[2].trim()
    const dateStr = match[3]
    const amount = Number.parseFloat(match[4].replace(/,/g, ""))
    const typeStr = match[5].toLowerCase()
    const type = typeStr.includes("deb") || typeStr.includes("dr") ? "debit" : "credit"
    const balanceMatch = match[0].match(/(?:Balance|Bal).*?[₹$Rs.\s]*([\d,]+\.?\d*)/i)

    transactions.push({
      date: parseDate(dateStr),
      description: description ? `${vendor} - ${description}` : vendor,
      amount,
      type,
      category: categorizeTransaction(vendor),
      balance: balanceMatch ? Number.parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      confidence: 0.92,
    })
  }

  // Pattern 3: ISO date format "txn123 2025-12-10 Amazon.in ... ₹2,999.00 Dr Bal 14171.50"
  const pattern3 = /(?:txn\w+\s+)?(\d{4}-\d{2}-\d{2})\s+(.+?)\s*[₹$Rs.\s]*([\d,]+\.?\d*)\s+(Dr|Cr|debit|credit|debited|credited)(?:\s+Bal\s+[₹$Rs.\s]*([\d,]+\.?\d*))?/gi

  pattern3.lastIndex = 0
  while ((match = pattern3.exec(text)) !== null) {
    if (isOverlapping(match.index, match.index + match[0].length)) continue
    processedRanges.push([match.index, match.index + match[0].length])
    
    const dateStr = match[1]
    const description = match[2].trim()
    const amount = Number.parseFloat(match[3].replace(/,/g, ""))
    const typeStr = match[4].toUpperCase()
    const type = typeStr.startsWith("D") ? "debit" : "credit"
    const balance = match[5] ? Number.parseFloat(match[5].replace(/,/g, "")) : undefined

    transactions.push({
      date: parseDate(dateStr),
      description,
      amount,
      type,
      category: categorizeTransaction(description),
      balance,
      confidence: 0.9,
    })
  }

  // Pattern 4: Generic fallback - date + amount + optional type indicator
  const pattern4 = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}).*?[₹$Rs.\s]([\d,]+\.?\d*)/gi
  
  pattern4.lastIndex = 0
  while ((match = pattern4.exec(text)) !== null) {
    if (isOverlapping(match.index, match.index + match[0].length)) continue
    if (transactions.length > 0) break // Fallback only if no specific patterns matched
    
    const dateStr = match[1]
    const amount = Number.parseFloat(match[2].replace(/,/g, ""))
    const fullMatch = match[0]
    const typeMatch = fullMatch.match(/(debit|credit|dr|cr|debited|credited)/i)
    const type = typeMatch && typeMatch[1].toLowerCase().startsWith("d") ? "debit" : "credit"
    
    // Extract description (text between date and amount)
    const descMatch = fullMatch.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+[₹$Rs.\s]/)
    const description = descMatch ? descMatch[2].trim() : fullMatch.substring(0, 50).trim()

    transactions.push({
      date: parseDate(dateStr),
      description,
      amount,
      type,
      category: categorizeTransaction(description),
      confidence: 0.7,
    })
  }

  return transactions
}

function parseDate(dateStr: string): Date {
  // Handle "11 Dec 2025" format
  if (/\d+\s+\w+\s+\d{4}/.test(dateStr)) {
    return new Date(dateStr)
  }

  // Handle "12/11/2025" format
  if (/\d+\/\d+\/\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/")
    return new Date(`${month}/${day}/${year}`)
  }

  // Handle "2025-12-10" format
  return new Date(dateStr)
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase()

  // Food & Dining
  if (desc.match(/starbucks|coffee|cafe|restaurant|pizza|burger|food|dining|zomato|swiggy|domino/)) return "food"
  
  // Transportation
  if (desc.match(/uber|ola|taxi|cab|ride|transport|bus|train|metro|flight|airport|fuel|petrol|diesel/)) return "transport"
  
  // Shopping
  if (desc.match(/amazon|flipkart|myntra|shop|store|mall|retail|order|purchase/)) return "shopping"
  
  // Entertainment
  if (desc.match(/netflix|spotify|prime|hotstar|movie|cinema|entertainment|game|youtube/)) return "entertainment"
  
  // Health & Fitness
  if (desc.match(/gym|health|hospital|doctor|pharmacy|medical|fitness|clinic/)) return "health"
  
  // Utilities & Bills
  if (desc.match(/electric|water|gas|bill|utility|phone|mobile|internet|broadband|recharge/)) return "utilities"
  
  // Transfer
  if (desc.match(/transfer|upi|neft|imps|rtgs|paytm|phonepe|gpay/)) return "transfer"

  return "other"
}

export { router as transactionRoutes }
