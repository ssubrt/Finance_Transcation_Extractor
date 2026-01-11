"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { TransactionTable } from "@/components/transaction-table"
import { getAuthToken } from "@/lib/client-auth"
import type { TransactionListResponse } from "@/lib/types"

interface ExtractedTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: "debit" | "credit"
  balance?: number
  category?: string
  confidence: number
  createdAt: string
}

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [fetchLoading, setFetchLoading] = useState(false)

  // Check authentication
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)
    loadTransactions()
    setLoading(false)
  }, [router])

  const loadTransactions = async (cursor?: string) => {
    try {
      setFetchLoading(true)
      const token = getAuthToken()
      if (!token) return

      const url = cursor
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/transactions?cursor=${cursor}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/transactions`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
        }
        return
      }

      const data = await response.json()
      if (cursor) {
        setTransactions((prev) => [...prev, ...data.transactions])
      } else {
        setTransactions(data.transactions)
      }
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error("Failed to load transactions:", error)
    } finally {
      setFetchLoading(false)
    }
  }

  const handleExtract = async () => {
    if (!text.trim()) return

    try {
      setExtracting(true)
      const token = getAuthToken()
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
        }
        return
      }

      const data = await response.json()
      if (data.success) {
        setText("")
        // Refresh transactions list
        loadTransactions()
      }
    } catch (error) {
      console.error("Failed to extract transaction:", error)
    } finally {
      setExtracting(false)
    }
  }

  const handleLoadMore = () => {
    if (nextCursor && !fetchLoading) {
      loadTransactions(nextCursor)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center py-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Finance Extractor</h1>
            <p className="text-slate-600 mt-1">Secure transaction management</p>
          </div>
          <Link href="/logout">
            <Button variant="outline">Logout</Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Extract Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Extract Transaction</CardTitle>
                <CardDescription>Paste bank statement text to parse</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste transaction text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-40 resize-none"
                  disabled={extracting}
                />
                <Button onClick={handleExtract} disabled={!text.trim() || extracting} className="w-full">
                  {extracting ? "Extracting..." : "Parse & Save"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Transactions</CardTitle>
                <CardDescription>All your extracted transactions with confidence scores</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No transactions yet. Start by extracting one!</div>
                ) : (
                  <>
                    <TransactionTable transactions={transactions} />
                    {hasMore && (
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={fetchLoading}
                        className="w-full mt-4 bg-transparent"
                      >
                        {fetchLoading ? "Loading..." : "Load More"}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
