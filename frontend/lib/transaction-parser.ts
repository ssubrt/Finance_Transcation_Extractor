interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: "debit" | "credit"
  balance?: number
  confidence: number
  category?: string
}

const categoryKeywords: Record<string, string[]> = {
  "Food & Dining": ["starbucks", "coffee", "restaurant", "cafe", "food", "pizza", "burger", "dining", "zomato", "swiggy", "domino", "mcdonald"],
  Transportation: ["uber", "taxi", "ola", "travel", "bus", "train", "flight", "airport", "cab", "ride", "metro", "fuel", "petrol", "diesel", "singapore airlines"],
  Shopping: ["amazon", "flipkart", "mall", "retail", "shop", "store", "order", "myntra", "purchase", "reliance", "big bazaar"],
  Utilities: ["electricity", "water", "gas", "phone", "internet", "bill", "utility", "mobile", "broadband", "recharge", "bescom", "airtel", "bsnl"],
  Entertainment: ["movie", "cinema", "netflix", "spotify", "game", "entertainment", "prime", "hotstar", "youtube", "bookmyshow"],
  Health: ["doctor", "hospital", "pharmacy", "medical", "health", "gym", "fitness", "clinic"],
  Transfer: ["transfer", "upi", "neft", "imps", "rtgs", "paytm", "phonepe", "gpay", "bajaj"],
}

function extractCategory(description: string): string | undefined {
  const lowerDesc = description.toLowerCase()
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerDesc.includes(keyword))) {
      return category
    }
  }
  return undefined
}

function parseDateString(dateStr: string): string {
  // Handle "11 Dec 2025" or "15-Jan-26" format
  if (/\d+[-\s]\w{3,}[-\s]\d{2,4}/.test(dateStr)) {
    const normalized = dateStr.replace(/[-]/g, " ")
    const parts = normalized.split(/\s+/)
    if (parts.length === 3) {
      let year = parts[2]
      if (year.length === 2) {
        year = `20${year}`
      }
      return new Date(`${parts[1]} ${parts[0]}, ${year}`).toISOString()
    }
    return new Date(normalized).toISOString()
  }

  // Handle "12/11/2025" or "12/11/25" format (DD/MM/YYYY)
  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/")
    const fullYear = year.length === 2 ? `20${year}` : year
    return new Date(`${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`).toISOString()
  }

  // Handle "2025-12-10" format (ISO)
  if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr).toISOString()
  }

  // Fallback
  try {
    return new Date(dateStr).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export function parseTransaction(text: string): ParsedTransaction | null {
  if (!text || text.trim().length === 0) return null

  // Pattern 1: Labeled format with newlines "Date: ...\nDescription: ...\nAmount: ..."
  const pattern1 = text.match(
    /Date:\s*(\d+\s+\w+\s+\d{4})\s*[\n\r]+\s*(?:Description:|Merchant:)\s*([^\n\r]+)[\n\r]+\s*Amount[:\s]+(?:USD|INR|Rs\.?|₹)?\s*([-+]?[\d.,]+)/i,
  )
  if (pattern1) {
    const dateStr = pattern1[1]
    const description = pattern1[2].trim()
    const amountStr = pattern1[3].replace(/,/g, "")
    const amount = Math.abs(Number.parseFloat(amountStr))
    const balanceMatch = text.match(/Balance.*?[:=\s](?:Rs\.?|INR|₹)?\s*([\d.,]+)/i)

    return {
      date: new Date(dateStr).toISOString(),
      description,
      amount,
      type: Number.parseFloat(amountStr) < 0 ? "debit" : "credit",
      balance: balanceMatch ? Math.abs(Number.parseFloat(balanceMatch[1].replace(/,/g, ""))) : undefined,
      confidence: 0.95,
      category: extractCategory(description),
    }
  }

  // Pattern 2: Pipe-separated "29-Dec-2025 | DOMINOS PIZZA | ₹850 | Debited"
  const pattern2 = text.match(
    /(\d{1,2}[-/]\w{3,}[-/]\d{2,4})\s*\|\s*([^|]+?)\s*\|\s*(?:Debited?:|Credited?:)?\s*(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s*\|\s*(?:Debited?|Credited?)/i,
  )
  if (pattern2) {
    const dateStr = pattern2[1]
    const description = pattern2[2].trim()
    const amount = Number.parseFloat(pattern2[3].replace(/,/g, ""))
    const type = text.toLowerCase().includes("debited") ? "debit" : "credit"
    const balanceMatch = text.match(/(?:Closing\s)?Bal[ance]*.*?(?:Rs\.?|INR|₹)?\s*([\d,.]+)/i)

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      balance: balanceMatch ? Number.parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      confidence: 0.93,
      category: extractCategory(description),
    }
  }

  // Pattern 3: Uber/Service style "Uber Ride * Airport\n12/11/2025 → ₹1,250.00 debited"
  const pattern3 = text.match(
    /([^\n*]+)\*?\s*([^\n]*?)[\n\r]*\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[→\-:]*\s*(?:[₹$Rs.\s]|INR\s)*([\d,.]+)\s*(debited|credited|debit|credit|dr|cr)/i,
  )
  if (pattern3) {
    const vendor = pattern3[1].trim()
    const description = pattern3[2].trim()
    const dateStr = pattern3[3]
    const amount = Number.parseFloat(pattern3[4].replace(/,/g, ""))
    const typeStr = pattern3[5].toLowerCase()
    const type = typeStr.includes("deb") || typeStr.includes("dr") ? "debit" : "credit"
    const balanceMatch = text.match(/(?:Available\s)?Balance.*?(?:[₹$Rs.\s]|INR\s)*([\d,.]+)/i)

    return {
      date: parseDateString(dateStr),
      description: description ? `${vendor} - ${description}` : vendor,
      amount,
      type,
      balance: balanceMatch ? Number.parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      confidence: 0.92,
      category: extractCategory(vendor),
    }
  }

  // Pattern 4: ISO date "2025-12-10 Amazon.in Order #... ₹2,999.00 Dr"
  const pattern4 = text.match(
    /(?:txn\w+\s+)?(\d{4}-\d{2}-\d{2})\s+(.+?)\s*(?:[₹$Rs.\s]|INR\s)*([\d,.]+)\s+(Dr|Cr|debit|credit|debited|credited)/i,
  )
  if (pattern4) {
    const dateStr = pattern4[1]
    const description = pattern4[2].trim()
    const amount = Number.parseFloat(pattern4[3].replace(/,/g, ""))
    const typeStr = pattern4[4].toUpperCase()
    const type = typeStr.startsWith("D") ? "debit" : "credit"
    const balanceMatch = text.match(/Bal\s+(?:[₹$Rs.\s]|INR\s)*([\d,.]+)/i)

    return {
      date: new Date(dateStr).toISOString(),
      description,
      amount,
      type,
      balance: balanceMatch ? Number.parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      confidence: 0.9,
      category: extractCategory(description),
    }
  }

  // Pattern 5: Bank SMS "Rs.1,450.00 debited ... on 15-Jan-26"
  const pattern5 = text.match(
    /(?:Rs\.?|INR|₹)\s*([\d,.]+)\s+(?:debited|credited)\s+(?:from|to)?.*?(?:on|at)\s+(\d{1,2}[-/]\w{3,}[-/]\d{2,4})/i,
  )
  if (pattern5) {
    const amount = Number.parseFloat(pattern5[1].replace(/,/g, ""))
    const dateStr = pattern5[2]
    const type = text.toLowerCase().includes("debited") ? "debit" : "credit"
    const descMatch = text.match(/(?:Info:|at|for|towards)\s*:?\s*([A-Z][^\n.]{3,70})/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 70).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.88,
      category: extractCategory(description),
    }
  }

  // Pattern 6: "A/C debited for Rs.XXX on date"
  const pattern6 = text.match(
    /(?:A\/C|Account|wallet).*?(?:debited|credited).*?(?:by|for|of)?\s*(?:Rs\.?|INR|₹)\s*([\d,.]+).*?on\s+(\d{1,2}[-/\s]\w{3,}[-/\s]\d{2,4})/i,
  )
  if (pattern6) {
    const amount = Number.parseFloat(pattern6[1].replace(/,/g, ""))
    const dateStr = pattern6[2]
    const type = text.toLowerCase().includes("debited") ? "debit" : "credit"
    const descMatch = text.match(/(?:for|towards|to|at)\s+([A-Z][^\n.]{3,70})/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 70).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.87,
      category: extractCategory(description),
    }
  }

  // Pattern 7: "paid/received Rs.XXX on date"
  const pattern7 = text.match(
    /(paid|received|sent|transfer|Payment)\s+(?:of\s)?(?:[₹$Rs.\s]|INR\s)*([\d,.]+).*?(?:on|at)\s+(\d{1,2}[-/\s]\w{3,}[-/\s]\d{2,4})/i,
  )
  if (pattern7) {
    const action = pattern7[1].toLowerCase()
    const amount = Number.parseFloat(pattern7[2].replace(/,/g, ""))
    const dateStr = pattern7[3]
    const type = action === "received" ? "credit" : "debit"
    const descMatch = text.match(/(?:to|from|for|at)\s+([A-Z][^\n.]{3,70})/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 70).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.85,
      category: extractCategory(description),
    }
  }

  // Pattern 8: "₹XXX sent to ... on date"
  const pattern8 = text.match(
    /(?:[₹$Rs.\s]|INR\s|of\sRs\.?\s)([\d,.]+)\s+(?:sent|paid|transferred|charged).*?(?:on|at)\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
  )
  if (pattern8) {
    const amount = Number.parseFloat(pattern8[1].replace(/,/g, ""))
    const dateStr = pattern8[2]
    const type = text.toLowerCase().match(/sent|paid|transferred|charged/) ? "debit" : "credit"
    const descMatch = text.match(/(?:to|from|for|at)\s+([^\n.]{3,70})/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 70).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.84,
      category: extractCategory(description),
    }
  }

  // Pattern 9: "Date\nPaid to: XXX\nAmount: Rs YYY"
  const pattern9 = text.match(
    /Date:\s*(\d{1,2}\s+\w{3,}\s+\d{4})\s*[\n\r]+.*?(?:Paid\sto|Merchant):\s*([^\n\r]+)[\n\r]+.*?Amount.*?(?:Rs\.?|INR|₹)?\s*([\d,.]+)/i,
  )
  if (pattern9) {
    const dateStr = pattern9[1]
    const description = pattern9[2].trim()
    const amount = Number.parseFloat(pattern9[3].replace(/,/g, ""))

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type: "debit",
      confidence: 0.86,
      category: extractCategory(description),
    }
  }

  // Pattern 10: Generic fallback
  const dateMatch = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d+\s+\w{3,}\s+\d{4})/)
  const amountMatch = text.match(/(?:[₹$]|INR\s*|Rs\.?\s*|of\sRs\.?\s)([\d,.]+)/)
  
  if (dateMatch && amountMatch) {
    const amount = Number.parseFloat(amountMatch[1].replace(/,/g, ""))
    
    // Skip if amount seems wrong
    if (isNaN(amount) || amount < 0.1 || amount > 10000000) return null
    
    const typeMatch = text.match(/(debited?|credited?|dr|cr|paid|received|sent)/i)
    
    // Extract description
    let description = "Transaction"
    if (dateMatch.index !== undefined && amountMatch.index !== undefined) {
      const descStart = dateMatch.index + dateMatch[0].length
      const descEnd = amountMatch.index
      if (descEnd > descStart) {
        description = text.substring(descStart, descEnd).trim().substring(0, 100)
        description = description.replace(/^[-|:*\s]+/, "").replace(/\s+/g, " ")
      }
    }
    
    if (!description || description.length < 3) {
      const merchantMatch = text.match(/(?:at|to|from)\s+([A-Z][^\n]{3,60})/i)
      description = merchantMatch ? merchantMatch[1].trim() : text.substring(0, 70).trim()
    }

    const typeStr = typeMatch ? typeMatch[1].toLowerCase() : ""
    const type = typeStr.match(/deb|dr|paid|sent/) ? "debit" : "credit"

    return {
      date: parseDateString(dateMatch[1]),
      description,
      amount,
      type,
      confidence: 0.7,
      category: extractCategory(description),
    }
  }

  return null
}
