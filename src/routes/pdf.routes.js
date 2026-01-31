import express from "express";
import { renderTemplate } from "../../utils/template-render.js";
import { validatePDFRequest } from "../../utils/validator.js";
import {
  prepareTemplateData,
  generatePDFDocument,
  createPDFAttachment,
} from "../services/pdf.service.js";
import {
  sendCustomerEmail,
  sendAgentEmail,
} from "../services/email.service.js";

const router = express.Router();

/**
 * Main PDF generation endpoint
 */
router.post("/generate-pdf", async (req, res) => {
  console.log("\n[API] ========== NEW REQUEST ==========");
  console.log("[API] Request type:", req.body.type);
  console.log("[API] Request data keys:", Object.keys(req.body.data || {}));

  // Log important date fields
  console.log("[API] Dates:", {
    departureDate: req.body.data?.departureDate,
    departureStartDate: req.body.data?.departureStartDate,
    departureEndDate: req.body.data?.departureEndDate,
    duration: req.body.data?.duration,
  });

  try {
    // 1. Validate request
    const validatedData = validatePDFRequest(req.body);
    const { type, data, recipients } = validatedData;

    const documentId = data.voucherNumber || data.quoteNumber || "unknown";
    console.log(`[API] Processing ${type} for: ${documentId}`);

    // 2. Prepare template data
    const templateData = prepareTemplateData(data);

    // 3. Generate PDF
    const pdfBuffer = await generatePDFDocument(type, templateData);

    // 4. Create PDF attachment
    const pdfAttachment = createPDFAttachment(type, documentId, pdfBuffer);

    // 5. Render email template
    const emailHtml = renderTemplate(`${type}-email`, templateData);

    // 6. Extract email data
    const isBookingVoucher = type === "booking-voucher";
    const customerEmail = recipients.customer?.email;
    const agentEmail = recipients.agent?.email;
    const customerName = data.customerName || "Customer";
    const agencyName = data.agencyName || "Agent";
    const customerPhone = data.customerPhone || "";
    const tourTitle = data.tourTitle || "Travel Package";
    const voucherNumber = documentId;

    // 7. Send emails
    const customerEmailResult = await sendCustomerEmail(
      customerEmail,
      type,
      tourTitle,
      voucherNumber,
      emailHtml,
      pdfAttachment,
    );

    const agentEmailResult = await sendAgentEmail(
      agentEmail,
      type,
      tourTitle,
      voucherNumber,
      emailHtml,
      pdfAttachment,
      customerName,
      agencyName,
      customerPhone,
      isBookingVoucher,
    );

    // 8. Check if all emails failed
    if (
      !customerEmailResult.success &&
      !agentEmailResult.success &&
      (customerEmail || agentEmail)
    ) {
      throw new Error("Failed to send emails to both customer and agent");
    }

    // 9. Send response
    console.log("[API] ========== REQUEST COMPLETE ==========\n");

    res.status(200).json({
      success: true,
      customerEmailSent: customerEmail ? customerEmailResult.success : false,
      agentEmailSent: agentEmail ? agentEmailResult.success : false,
      pdfAttached: true,
      pdfGenerated: true,
      messageId: customerEmailResult.messageId || agentEmailResult.messageId,
    });
  } catch (error) {
    console.error("[API] ✗ Error:", error.message);
    console.error("[API] ========== REQUEST FAILED ==========\n");

    res.status(500).json({
      success: false,
      customerEmailSent: false,
      agentEmailSent: false,
      pdfAttached: false,
      pdfGenerated: false,
      error: error.message || "Unknown error",
    });
  }
});

export default router;
