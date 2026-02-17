import { z } from "zod";

const EmailRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});

const BookingDataSchema = z.object({
  voucherNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email().nullable(),
  customerPhone: z.string(),
  tourTitle: z.string(),
  destination: z.string().nullable(),
  departureDate: z.string(),
  endDate: z.string(),
  paxAdults: z.number(),
  paxChildren: z.number(),
  paxInfants: z.number(),
  totalAmount: z.number(),
  agencyName: z.string(),
  agencyPhone: z.string(),
  agencyEmail: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional(),
  agentName: z.string().nullable().optional(),
  specialRequests: z.string().nullable().optional(),
  inclusions: z.array(z.string()).nullable().optional(),
  itinerary: z.array(z.any()).nullable().optional(),
  nightAllocations: z.array(z.any()).nullable().optional(),
  travelers: z.array(z.any()).optional(),
  paymentInfo: z.any().optional(),
  bannerImageUrl: z.string().nullable().optional(),
  brandTag: z.string().nullable().optional(),
  includeTcs: z.boolean().optional(),
  flightIncluded: z.boolean().nullable().optional(),
  departureAirport: z.string().nullable().optional(),
  flightDetails: z.any().nullable().optional(),
});

const QuoteDataSchema = z.object({
  quoteNumber: z.string(),
  quoteDate: z.string(),
  validUntil: z.string(),
  customerName: z.string().default("Customer"),
  customerEmail: z.string().email().nullable(),
  customerPhone: z.string(),
  tourTitle: z.string(),
  destination: z.string().nullable(),
  departureDate: z.string(),
  departureStartDate: z.string().nullable().optional(),
  departureEndDate: z.string().nullable().optional(),
  endDate: z.string().optional(),
  duration: z.string(),
  paxAdults: z.number(),
  paxChildren: z.number(),
  paxInfants: z.number(),
  pricePerAdult: z.number().nullable().optional(),
  pricePerChild: z.number().nullable().optional(),
  pricePerInfant: z.number().nullable().optional(),
  totalAmount: z.number(),
  agencyName: z.string(),
  agencyPhone: z.string(),
  agencyEmail: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional(),
  agentName: z.string().nullable().optional(),
  inclusions: z.array(z.string()).nullable().optional(),
  exclusions: z.array(z.string()).nullable().optional(),
  tourInclusions: z.any().nullable().optional(),
  itinerary: z.array(z.any()).nullable().optional(),
  nightAllocations: z.array(z.any()).nullable().optional(),
  termsAndConditions: z.string().nullable().optional(),
  specialNotes: z.string().nullable().optional(),
  bannerImageUrl: z.string().nullable().optional(),
  brandTag: z.string().nullable().optional(),
  includeTcs: z.boolean().optional(),
  flightIncluded: z.boolean().nullable().optional(),
  country: z.string().nullable().optional(),
  roomCount: z.number().optional(),
  highlights: z.array(z.string()).nullable().optional(),
  aboutDescription: z.string().nullable().optional(),
  specialRequests: z.string().nullable().optional(),
  originCity: z.string().nullable().optional(),
  termsConditions: z.string().nullable().optional(),
  cancellationPolicy: z.string().nullable().optional(),
  departureAirport: z.string().nullable().optional(),
  flightDetails: z.any().nullable().optional(),
  packageImages: z.array(z.string()).nullable().optional(),
  quoteLink: z.string().nullable().optional(),
});

const InvoiceDataSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  bookingId: z.string(),
  bookingDate: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email().nullable().optional(),
  customerPhone: z.string(),
  tourTitle: z.string(),
  destination: z.string(),
  country: z.string(),
  duration: z.string(),
  departureDate: z.string(),
  endDate: z.string(),
  paxAdults: z.number(),
  paxChildren: z.number(),
  paxInfants: z.number(),
  subtotal: z.number(),
  gstRate: z.number(),
  gstAmount: z.number(),
  tcsAmount: z.number().nullable().optional(),
  grandTotal: z.number(),
  includeTcs: z.boolean().optional(),
  sacCode: z.string().optional(),
  paymentType: z.string().optional(),
  payments: z
    .array(
      z.object({
        paymentNumber: z.number(),
        amount: z.number(),
        transactionId: z.string(),
        paymentMethod: z.string(),
        paidDate: z.string(),
      }),
    )
    .optional(),
  agencyName: z.string().nullable().optional(),
  agentName: z.string().nullable().optional(),
  agencyPhone: z.string().nullable().optional(),
  agencyEmail: z.string().nullable().optional(),
});

const PDFRequestSchema = z
  .object({
    type: z.enum(["booking-voucher", "quote", "invoice"]),
    data: z.any(),
    recipients: z
      .object({
        customer: EmailRecipientSchema.optional(),
        agent: EmailRecipientSchema.optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow extra fields and strip undefined

export function validatePDFRequest(data) {
  // Remove undefined recipients field if present
  if (data.recipients === undefined) {
    delete data.recipients;
  }

  // First validate the basic structure
  const validated = PDFRequestSchema.parse(data);

  // Then validate the data based on type
  if (validated.type === "booking-voucher") {
    validated.data = BookingDataSchema.parse(validated.data);
  } else if (validated.type === "quote") {
    validated.data = QuoteDataSchema.parse(validated.data);

    // Calculate endDate if missing
    if (
      !validated.data.endDate &&
      validated.data.departureDate &&
      validated.data.duration
    ) {
      const days = parseInt(
        validated.data.duration.match(/(\d+)\s*Day/i)?.[1] || "0",
      );
      if (days > 0) {
        const startDate = new Date(validated.data.departureDate);
        // Only calculate endDate if startDate is valid
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + days - 1);
          validated.data.endDate = endDate.toISOString().split("T")[0];
        } else {
          // If departureDate is not a valid date (e.g., "To be confirmed"), use it as-is
          validated.data.endDate = validated.data.departureDate;
        }
      } else {
        validated.data.endDate = validated.data.departureDate;
      }
    }
  } else if (validated.type === "invoice") {
    validated.data = InvoiceDataSchema.parse(validated.data);
  }

  return validated;
}
