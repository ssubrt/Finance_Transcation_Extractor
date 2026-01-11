import type { TransactionResponse } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface TransactionTableProps {
  transactions: TransactionResponse[]
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return "bg-green-50 text-green-700"
    if (confidence >= 0.8) return "bg-blue-50 text-blue-700"
    return "bg-yellow-50 text-yellow-700"
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200">
            <TableHead className="text-slate-900 font-semibold">Date</TableHead>
            <TableHead className="text-slate-900 font-semibold">Description</TableHead>
            <TableHead className="text-right text-slate-900 font-semibold">Amount</TableHead>
            <TableHead className="text-center text-slate-900 font-semibold">Type</TableHead>
            <TableHead className="text-center text-slate-900 font-semibold">Category</TableHead>
            <TableHead className="text-center text-slate-900 font-semibold">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((txn) => (
            <TableRow key={txn.id} className="border-b border-slate-100 hover:bg-slate-50">
              <TableCell className="text-slate-700 text-sm">{formatDate(txn.date)}</TableCell>
              <TableCell className="text-slate-700 text-sm truncate max-w-xs">{txn.description}</TableCell>
              <TableCell className="text-right text-slate-900 font-medium text-sm">
                {formatCurrency(txn.amount)}
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    txn.type === "debit" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                </span>
              </TableCell>
              <TableCell className="text-center text-slate-600 text-sm">{txn.category || "-"}</TableCell>
              <TableCell className="text-center">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(txn.confidence)}`}
                >
                  {(txn.confidence * 100).toFixed(0)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
