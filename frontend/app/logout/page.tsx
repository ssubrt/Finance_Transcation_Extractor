"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { removeAuthToken } from "@/lib/client-auth"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear auth token and redirect
    removeAuthToken()
    router.push("/login")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">Logging out...</div>
    </div>
  )
}
