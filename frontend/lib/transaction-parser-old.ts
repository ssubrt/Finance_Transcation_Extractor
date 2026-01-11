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
  "Food & Dining": ["starbucks", "coffee", "restaurant", "cafe", "food", "pizza", "burger", "dining", "zomato", "swiggy", "domino"],
  Transportation: ["uber", "taxi", "ola", "travel", "bus", "train", "flight", "airport", "cab", "ride", "metro", "fuel", "petrol", "diesel"],
  Shopping: ["amazon", "flipkart", "mall", "retail", "shop", "store", "order", "myntra", "purchase"],
  Utilities: ["electricity", "water", "gas", "phone", "internet", "bill", "utility", "mobile", "broadband", "recharge"],
  Entertainment: ["movie", "cinema", "netflix", "spotify", "game", "entertainment", "prime", "hotstar", "youtube"],
  Health: ["doctor", "hospital", "pharmacy", "medical", "health", "gym", "fitness", "clinic"],
  Transfer: ["transfer", "upi", "neft", "imps", "rtgs", "paytm", "phonepe", "gpay"],
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

export function parseTransaction(text: string): ParsedTransaction | null {
  if (!text || text.trim().length === 0) return null

  // Pattern 1: Labeled format "Date: 11 Dec 2025 ... Description: ... Amount: -420.00"
  const pattern1 = text.match(
    /Date:\s*(\d+\s+\w+\s+\d{4}).*?(?:Description:|Merchant:)\s*([^\n]+?).*?Amount.*?[:\s]([-+]?[\d.,]+)/is,
  )
  if (pattern1) {
    const dateStr = pattern1[1]
    const description = pattern1[2].trim()
    const amount = Number.parseFloat(pattern1[3].replace(/,/g, ""))
    const balanceMatch = text.match(/Balance.*?[:\s]([-\d.,]+)/i)

    return {
      date: new Date(dateStr).toISOString(),
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
      balance: balanceMatch ? Number.parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      confidence: 0.95,
      category: extractCategory(description),
    }
  }

  // Pattern 2: Uber/Service style "Uber Ride * Airport | 12/11/2025 → ₹1,250.00 debited"
  const pattern2 = text.match(
    /([^\n*]+)\*?\s*([^\n]*?)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[→\-:]*\s*[₹$Rs.\s]*([\d,.]+)\s*(debited|credited|debit|credit|dr|cr)/i,
  )
  if (pattern2) {
    const vendor = pattern2[1].trim()
    const description = pattern2[2].trim()
    const dateStr = pattern2[3]
    const amount = Number.parseFloat(pattern2[4].replace(/,/g, ""))
    const typeStr = pattern2[5].toLowerCase()
    const type = typeStr.includes("deb") || typeStr.includes("dr") ? "debit" : "credit"
    const balanceMatch = text.match(/(?:Available Balance|Balance).*?[₹$Rs.\s]*([\d,.]+)/i)

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

  // Pattern 3: ISO date format "2025-12-10 Amazon.in ... ₹2,999.00 Dr"
  const pattern3 = text.match(
    /(?:txn\w+\s+)?(\d{4}-\d{2}-\d{2})\s+(.+?)\s*[₹$Rs.\s]*([\d,.]+)\s+(Dr|Cr|debit|credit|debited|credited)(?:\s+Bal\s+[₹$Rs.\s]*([\d,.]+))?/i,
  )
  if (pattern3) {
    const dateStr = pattern3[1]
    const description = pattern3[2].trim()
    const amount = Number.parseFloat(pattern3[3].replace(/,/g, ""))
    const typeStr = pattern3[4].toUpperCase()
    const type = typeStr.startsWith("D") ? "debit" : "credit"
    const balance = pattern3[5] ? Number.parseFloat(pattern3[5].replace(/,/g, "")) : undefined

    return {
      date: new Date(dateStr).toISOString(),
      description,
      amount,
      type,
      balance,
      confidence: 0.9,
      category: extractCategory(description),
    }
  }

  // Pattern 4: Bank SMS "Rs.1,450.00 ... debited ... on 15-Jan-26"
  const pattern4 = text.match(
    /(?:Rs\.?|INR|₹)\s*([\d,.]+)\s+(?:debited|credited)\s+(?:from|to)?.*?(?:on|at)\s+(\d{1,2}[-/]\w{3}[-/]\d{2,4})/i,
  )
  if (pattern4) {
    const amount = Number.parseFloat(pattern4[1].replace(/,/g, ""))
    const dateStr = pattern4[2]
    const type = text.toLowerCase().includes("debited") ? "debit" : "credit"
    const descMatch = text.match(/(?:Info:|at|for|towards|to)\s+([^\n.]+)/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 50).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.88,
      category: extractCategory(description),
    }
  }

  // Pattern 5: "A/C debited ... on date" format
  const pattern5 = text.match(
    /(?:A\/C|Account|a\/c).*?(?:debited|credited).*?(?:Rs\.?|INR|₹)\s*([\d,.]+).*?on\s+(\d{1,2}[-/]\w+[-/]\d{2,4})/i,
  )
  if (pattern5) {
    const amount = Number.parseFloat(pattern5[1].replace(/,/g, ""))
    const dateStr = pattern5[2]
    const type = text.toLowerCase().includes("debited") ? "debit" : "credit"
    const descMatch = text.match(/(?:Info:|at|for|towards|to)\s+([^\n.]+)/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 50).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.87,
      category: extractCategory(description),
    }
  }

  // Pattern 6: Pipe-separated format "Date | Description | Amount | Type"
  const pattern6 = text.match(
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s*\|\s*([^|]+)\s*\|\s*(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s*\|\s*(debit|credit|dr|cr)/i,
  )
  if (pattern6) {
    const dateStr = pattern6[1]
    const description = pattern6[2].trim()
    const amount = Number.parseFloat(pattern6[3].replace(/,/g, ""))
    const typeStr = pattern6[4].toLowerCase()
    const type = typeStr.startsWith("d") ? "debit" : "credit"

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.91,
      category: extractCategory(description),
    }
  }

  // Pattern 7: "paid/received amount ... on date" format
  const pattern7 = text.match(
    /(paid|received|sent|transfer(?:red)?)\s+[₹$Rs.\s]*([\d,.]+).*?(?:on|at)\s+(\d{1,2}[-/\s]\w+[-/\s]\d{2,4})/i,
  )
  if (pattern7) {
    const action = pattern7[1].toLowerCase()
    const amount = Number.parseFloat(pattern7[2].replace(/,/g, ""))
    const dateStr = pattern7[3]
    const type = action === "received" ? "credit" : "debit"
    const descMatch = text.match(/(?:to|from|for|at)\s+([A-Z][^\n.]{5,50})/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 50).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.85,
      category: extractCategory(description),
    }
  }

  // Pattern 8: Amount at start "₹1,200.00 sent to ... on date"
  const pattern8 = text.match(
    /[₹$Rs.\s]([\d,.]+)\s+(?:sent|paid|transferred|debited|credited).*?(?:on|at)\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
  )
  if (pattern8) {
    const amount = Number.parseFloat(pattern8[1].replace(/,/g, ""))
    const dateStr = pattern8[2]
    const type = text.toLowerCase().match(/sent|paid|transferred|debited/) ? "debit" : "credit"
    const descMatch = text.match(/(?:to|from|for|at)\s+([^\n.]{5,50})/i)
    const description = descMatch ? descMatch[1].trim() : text.substring(0, 50).trim()

    return {
      date: parseDateString(dateStr),
      description,
      amount,
      type,
      confidence: 0.84,
      category: extractCategory(description),
    }
  }

  // Pattern 9: Generic fallback - must have both date and amount
  const dateMatch = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d+\s+\w{3,}\s+\d{4})/)
  const amountMatch = text.match(/(?:[₹$Rs.\s]|INR\s*)([\d,.]+)/)
  
  if (dateMatch && amountMatch) {
    const typeMatch = text.match(/(debited?|credited?|dr|cr|paid|received|sent)/i)
    
    // Extract description between date and amount
    let description = "Transaction"
    if (dateMatch.index !== undefined && amountMatch.index !== undefined) {
      const descStart = dateMatch.index + dateMatch[0].length
      const descEnd = amountMatch.index
      if (descEnd > descStart) {
        description = text.substring(descStart, descEnd).trim().substring(0, 100)
      }
    }
    
    // If no description found, look for merchant/vendor names
    if (!description || description.length < 3) {
      const merchantMatch = text.match(/(?:at|to|from)\s+([A-Z][^\n]{3,40})/i)
      description = merchantMatch ? merchantMatch[1].trim() : text.substring(0, 50).trim()
    }

    const amount = Number.parseFloat(amountMatch[1].replace(/,/g, ""))
    if (isNaN(amount) || amount === 0) return null

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

function parseDateString(dateStr: string): string {
  // Handle "11 Dec 2025" or "15-Jan-26" format
  if (/\d+[-\s]\w{3,}[-\s]\d{2,4}/.test(dateStr)) {
    // Normalize the date string
    const normalized = dateStr.replace(/[-]/g, " ")
    const parts = normalized.split(/\s+/)
    if (parts.length === 3) {
      let year = parts[2]
      // Convert 2-digit year to 4-digit
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

  // Fallback: try to parse as-is
  try {
    return new Date(dateStr).toISOString()
  } catch {
    return new Date().toISOString()
  }
}
