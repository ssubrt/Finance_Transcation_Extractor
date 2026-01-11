import { parseTransaction } from "@/lib/transaction-parser"

describe("Transaction Parser - Comprehensive Tests", () => {
  describe("Original Samples", () => {
    it("Sample 1: Labeled format with Date/Description/Amount", () => {
      const text = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.description).toContain("STARBUCKS")
      expect(result?.amount).toBe(420)
      expect(result?.type).toBe("debit")
      expect(result?.category).toBe("Food & Dining")
      expect(result?.balance).toBe(18420.5)
    })

    it("Sample 2: Uber style with arrow and rupee symbol", () => {
      const text = `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.description).toContain("Uber")
      expect(result?.amount).toBe(1250)
      expect(result?.type).toBe("debit")
      expect(result?.category).toBe("Transportation")
    })

    it("Sample 3: ISO date with Dr/Cr format", () => {
      const text = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.description).toContain("Amazon")
      expect(result?.amount).toBe(2999)
      expect(result?.type).toBe("debit")
      expect(result?.balance).toBe(14171.5)
    })
  })

  describe("Indian Bank SMS Formats", () => {
    it("Sample 4: HDFC Bank SMS", () => {
      const text = `Your A/C XX1234 debited with Rs.1,450.00 on 15-Jan-26. Info: SWIGGY*FOOD ORDER. Avbl Bal: Rs.25,340.50`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1450)
      expect(result?.type).toBe("debit")
    })

    it("Sample 5: ICICI Bank UPI SMS", () => {
      const text = `Rs 850.50 debited from A/c **5678 on 14-01-2026 to VPA paytm@paytm (UPI Ref No 402345678912). Available Balance: Rs 24,490.00`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(850.5)
      expect(result?.type).toBe("debit")
    })

    it("Sample 6: SBI Bank SMS", () => {
      const text = `Dear Customer, Your A/c no. XX9876 is debited for Rs.2,100.00 on 13Jan2026 towards NETFLIX SUBSCRIPTION. Available balance Rs.22,390.00`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(2100)
      expect(result?.type).toBe("debit")
      expect(result?.description).toContain("NETFLIX")
    })

    it("Sample 7: Axis Bank SMS", () => {
      const text = `INR 3,250.00 debited from account **4321 on 12-Jan-26 for Amazon Pay. Avl bal: INR 19,140.00. Not you? Call 1800-123-4567`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(3250)
      expect(result?.type).toBe("debit")
    })

    it("Sample 8: Kotak Mahindra SMS", () => {
      const text = `AC XX3456 debited Rs 599 on 11/01/2026 at ZOMATO GOLD. Avl bal Rs 18541.00`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(599)
      expect(result?.type).toBe("debit")
      expect(result?.description).toContain("ZOMATO")
    })
  })

  describe("UPI Transaction Formats", () => {
    it("Sample 9: PhonePe transaction", () => {
      const text = `You paid ₹450 to Rohit Sharma via PhonePe on 10 Jan 2026, 3:45 PM. UPI Ref: 401234567890`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(450)
      expect(result?.type).toBe("debit")
    })

    it("Sample 10: Google Pay transaction", () => {
      const text = `₹1,200.00 sent to merchant@paytm on 09-01-2026 14:23. UPI transaction ID: 402198765432`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1200)
    })

    it("Sample 11: Paytm wallet payment", () => {
      const text = `Paytm Payment of Rs.750 to RELIANCE DIGITAL on 08/01/26 is Successful. Wallet balance: Rs.2,340`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(750)
      expect(result?.description).toContain("RELIANCE")
    })
  })

  describe("Credit Card Statement Formats", () => {
    it("Sample 12: Credit card detailed format", () => {
      const text = `Date: 07 Jan 2026
Merchant: APPLE.COM/BILL
Amount: USD 9.99 (₹830.00)
Type: International Transaction
Balance: ₹45,670 CR`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(830)
      expect(result?.description).toContain("APPLE")
    })

    it("Sample 13: Credit card short format", () => {
      const text = `15/01/2026 | FLIPKART SALE | Rs. 4,599.00 | Debit`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(4599)
      expect(result?.type).toBe("debit")
      expect(result?.description).toContain("FLIPKART")
    })

    it("Sample 14: Credit card with transaction ID", () => {
      const text = `Transaction ID: CC78901234
Date: 2026-01-06
Description: UBER *TRIPFARE
Amount: $12.50 (Rs. 1,037.50)
Card: XXXX-1234
Status: Posted`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1037.5)
      expect(result?.description).toContain("UBER")
    })
  })

  describe("E-Wallet Formats", () => {
    it("Sample 15: Razorpay receipt", () => {
      const text = `Payment received ₹15,000 from John Doe on 05 Jan 2026. Fee: ₹300. Net: ₹14,700`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(15000)
      expect(result?.type).toBe("credit")
    })

    it("Sample 16: Mobikwik wallet debit", () => {
      const text = `Your Mobikwik wallet debited by Rs.399 on 04-Jan-2026 for DTH Recharge - Tata Sky`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(399)
      expect(result?.type).toBe("debit")
    })

    it("Sample 17: Freecharge payment", () => {
      const text = `Rs 250 paid to BSNL Prepaid on 03/01/2026 via Freecharge. Cashback: Rs 10`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(250)
    })
  })

  describe("Bill Payment Formats", () => {
    it("Sample 18: Electricity bill payment", () => {
      const text = `BESCOM Bill Payment - Rs.3,450 paid on 02-Jan-2026. Consumer No: 123456789. Due date was 05-Jan-2026`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(3450)
    })

    it("Sample 19: Mobile recharge", () => {
      const text = `Airtel Prepaid recharge of Rs.599 successful on 01/01/2026. Plan: Unlimited + 2GB/day for 84 days`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(599)
      expect(result?.description).toContain("Airtel")
    })

    it("Sample 20: Insurance premium", () => {
      const text = `LIC Premium Rs.12,500 paid on 31-Dec-2025. Policy: 987654321. Receipt: R/2025/1234567`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(12500)
    })
  })

  describe("Messy/Unstructured Formats", () => {
    it("Sample 21: Very messy format", () => {
      const text = `txn998877 big bazaar purchase 2025-12-30 items:grocery total=Rs.2,847.50 Dr balance=15292.50 category=shopping`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(2847.5)
      expect(result?.type).toBe("debit")
    })

    it("Sample 22: Minimal info", () => {
      const text = `30/12/2025 McDonald's 385 Dr`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBeGreaterThan(0)
    })

    it("Sample 23: Mixed format", () => {
      const text = `Ref#TX123456 | 29-Dec-2025 | DOMINOS PIZZA - DELIVERY | Debited: ₹850 | Closing Bal: ₹14,442.50`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(850)
      expect(result?.type).toBe("debit")
    })

    it("Sample 24: WhatsApp style alert", () => {
      const text = `💰 Transaction Alert
Date: 28 Dec 2025
Paid to: BookMyShow
Amount: Rs 600
Mode: UPI
Balance: Rs 13,842.50`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(600)
    })

    it("Sample 25: Email receipt format", () => {
      const text = `Order Confirmation - #ORD567890
Date: 27/12/2025
Myntra Fashion - Women's Kurta Set
Payment Method: Debit Card
Amount Paid: ₹1,999.00
Delivery by: 02/01/2026`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1999)
    })
  })

  describe("International Formats", () => {
    it("Sample 26: USD transaction", () => {
      const text = `12/26/2025 - STARBUCKS SEATTLE WA - $5.75 USD - Debit - Balance: $234.50`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(5.75)
      expect(result?.type).toBe("debit")
    })

    it("Sample 27: Multi-currency format", () => {
      const text = `Date: 25 Dec 2025
Merchant: BOOKING.COM AMSTERDAM
Original Amount: €89.00 EUR
Converted Amount: ₹8,010.00 INR
Exchange Rate: 90.00
Type: Debit`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(8010)
      expect(result?.type).toBe("debit")
    })

    it("Sample 28: Singapore Dollar transaction", () => {
      const text = `SGD 45.00 charged on 24/12/2025 at SINGAPORE AIRLINES. Converted to INR 2,812.50. Balance: INR 11,030.00`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBeGreaterThan(0)
    })
  })

  describe("Transfer Formats", () => {
    it("Sample 29: NEFT transfer", () => {
      const text = `NEFT Transfer of Rs.25,000 to BENEFICIARY NAME - HDFC0001234 on 23-12-2025. UTR: HDFCN25123456789. Charges: Rs.5`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(25000)
    })

    it("Sample 30: IMPS transfer", () => {
      const text = `IMPS-401234567890-Rs 5000-Sent to SAVINGS A/C-XX7890-23Dec2025 14:25-Bal Rs 6030.00`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(5000)
    })

    it("Sample 31: RTGS credit", () => {
      const text = `RTGS Credit of Rs.1,50,000 received on 22/12/2025 from SENDER NAME. Ref: RBTC25122212345678`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(150000)
      expect(result?.type).toBe("credit")
    })
  })

  describe("ATM Withdrawal Formats", () => {
    it("Sample 32: ATM withdrawal detailed", () => {
      const text = `Cash withdrawal of Rs.5,000 at HDFC ATM, MG Road, Mumbai on 21/12/2025 18:45. Available balance: Rs.1,030.00`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(5000)
    })

    it("Sample 33: ATM withdrawal short", () => {
      const text = `21-Dec-25 | ATM WD | 3000 | Dr | Bal: -1970.00 (overdraft)`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(3000)
      expect(result?.type).toBe("debit")
    })
  })

  describe("Subscription/Recurring Formats", () => {
    it("Sample 34: Auto-debit subscription", () => {
      const text = `Auto-debit: Amazon Prime yearly subscription Rs.1,499 on 20/12/2025. Next billing: 20/12/2026`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1499)
      expect(result?.description).toContain("Amazon")
    })

    it("Sample 35: EMI payment", () => {
      const text = `EMI-3/12 paid Rs.8,333 to BAJAJ FINSERV on 19-Dec-2025 for Loan A/c 123456789. Outstanding: Rs.75,000`

      const result = parseTransaction(text)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(8333)
    })
  })

  describe("Edge Cases", () => {
    it("should return null for unparseable text", () => {
      const result = parseTransaction("Random text without transaction data")
      expect(result).toBeNull()
    })

    it("should handle empty string", () => {
      const result = parseTransaction("")
      expect(result).toBeNull()
    })

    it("should handle text with only date", () => {
      const result = parseTransaction("10/01/2026")
      expect(result).toBeNull()
    })

    it("should handle text with only amount", () => {
      const result = parseTransaction("₹1000")
      expect(result).toBeNull()
    })
  })
})
