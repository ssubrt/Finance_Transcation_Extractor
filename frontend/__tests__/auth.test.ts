import { hashPassword, verifyPassword, createJWT, verifyJWT } from "@/lib/auth"

describe("Authentication", () => {
  describe("Password hashing", () => {
    it("should hash and verify passwords correctly", async () => {
      const password = "TestPassword123"
      const hashed = await hashPassword(password)
      expect(hashed).not.toBe(password)

      const isValid = await verifyPassword(password, hashed)
      expect(isValid).toBe(true)
    })

    it("should reject incorrect passwords", async () => {
      const password = "TestPassword123"
      const wrongPassword = "WrongPassword456"
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword(wrongPassword, hashed)
      expect(isValid).toBe(false)
    })
  })

  describe("JWT operations", () => {
    it("should create and verify JWT", async () => {
      const payload = {
        userId: "user123",
        organizationId: "org123",
        email: "test@example.com",
      }

      const token = await createJWT(payload)
      expect(token).toBeTruthy()

      const verified = await verifyJWT(token)
      expect(verified).not.toBeNull()
      expect(verified?.userId).toBe(payload.userId)
      expect(verified?.email).toBe(payload.email)
    })

    it("should reject invalid JWT", async () => {
      const verified = await verifyJWT("invalid.token.here")
      expect(verified).toBeNull()
    })
  })
})
