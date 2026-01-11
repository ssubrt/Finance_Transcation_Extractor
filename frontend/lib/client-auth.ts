export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth-token", token)
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth-token")
  }
  return null
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth-token")
  }
}
