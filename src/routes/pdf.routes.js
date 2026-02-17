import express from "express";
import { renderTemplate } from "../../utils/template-render.js";
import { validatePDFRequest } from "../../utils/validator.js";
import {
  prepareTemplateData,
  generatePDFDocument,
  prepareInvoiceData,
} from "../services/pdf.service.js";

const router = express.Router();

/**
 * Main PDF generation endpoint - Returns PDF as base64
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
    brandTag: req.body.data?.brandTag,
  });

  // Log inclusions data
  console.log("[API] Inclusions data check:", {
    hasInclusions: !!req.body.data?.inclusions,
    hasExclusions: !!req.body.data?.exclusions,
    hasTourInclusions: !!req.body.data?.tourInclusions,
    tourInclusionsValue: req.body.data?.tourInclusions,
  });

  try {
    // 1. Validate request
    const validatedData = validatePDFRequest(req.body);
    const { type, data } = validatedData;

    const documentId = data.voucherNumber || data.quoteNumber || "unknown";

    // 2. Prepare template data
    const templateData = prepareTemplateData(data);

    // 3. Generate PDF
    const pdfBuffer = await generatePDFDocument(type, templateData);

    // 4. Create filename with customer name
    const customerName = (data.customerName || "Customer")
      .replace(/[^a-zA-Z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .toLowerCase();
    const filename = `${customerName}-${documentId}.pdf`;

    // 5. Convert PDF to base64
    const pdfBase64 = pdfBuffer.toString("base64");

    console.log("[API] ========== REQUEST COMPLETE ==========\n");

    // 7. Return PDF and email HTML to main app
    res.status(200).json({
      success: true,
      pdf: pdfBase64,
      filename: filename,
      metadata: {
        type: type,
        documentId: documentId,
        size: pdfBuffer.length,
        tourTitle: data.tourTitle || "Travel Package",
        customerName: data.customerName || "Customer",
        agencyName: data.agencyName || "Agent",
      },
    });
  } catch (error) {
    console.error("[API] ✗ Error:", error.message);
    console.error("[API] ========== REQUEST FAILED ==========\n");

    res.status(500).json({
      success: false,
      error: error.message || "Unknown error",
    });
  }
});

/**
 * Invoice PDF generation endpoint
 */
router.post("/generate-invoice", async (req, res) => {
  console.log("\n[API] ========== INVOICE REQUEST ==========");
  console.log("[API] Request type:", req.body.type);
  console.log("[API] Invoice number:", req.body.data?.invoiceNumber);

  // Log complete incoming data
  console.log("\n[API] 📦 COMPLETE INVOICE DATA:");
  console.log(JSON.stringify(req.body.data, null, 2));

  try {
    // 1. Validate request structure
    if (!req.body.data) {
      throw new Error("Missing invoice data");
    }

    const { data } = req.body;

    // Log key fields
    console.log("\n[API] 📋 KEY INVOICE FIELDS:");
    console.log("- Invoice Number:", data.invoiceNumber);
    console.log("- Invoice Date:", data.invoiceDate);
    console.log("- Booking ID:", data.bookingId);
    console.log("- Booking Date:", data.bookingDate);
    console.log("- Customer Name:", data.customerName);
    console.log("- Customer Email:", data.customerEmail);
    console.log("- Customer Phone:", data.customerPhone);
    console.log("- Tour Title:", data.tourTitle);
    console.log("- Destination:", data.destination);
    console.log("- Country:", data.country);
    console.log("- Duration:", data.duration);
    console.log("- Departure Date:", data.departureDate);
    console.log("- End Date:", data.endDate);
    console.log("- Pax Adults:", data.paxAdults);
    console.log("- Pax Children:", data.paxChildren);
    console.log("- Pax Infants:", data.paxInfants);

    console.log("\n[API] 💰 AMOUNT DETAILS:");
    console.log("- Subtotal:", data.subtotal);
    console.log("- GST Rate:", data.gstRate);
    console.log("- GST Amount:", data.gstAmount);
    console.log("- TCS Amount:", data.tcsAmount);
    console.log("- Grand Total:", data.grandTotal);
    console.log("- Include TCS:", data.includeTcs);
    console.log("- SAC Code:", data.sacCode);
    console.log("- Payment Type:", data.paymentType);

    console.log("\n[API] 💳 PAYMENT HISTORY:");
    if (data.payments && data.payments.length > 0) {
      console.log(`- Total Payments: ${data.payments.length}`);
      data.payments.forEach((payment, index) => {
        console.log(`  Payment ${index + 1}:`, {
          paymentNumber: payment.paymentNumber,
          amount: payment.amount,
          transactionId: payment.transactionId,
          paymentMethod: payment.paymentMethod,
          paidDate: payment.paidDate,
        });
      });
    } else {
      console.log("- No payment history provided");
    }

    console.log("\n[API] 🏢 AGENCY INFORMATION:");
    console.log("- Agency Name:", data.agencyName || "N/A");
    console.log("- Agent Name:", data.agentName || "N/A");
    console.log("- Agency Phone:", data.agencyPhone || "N/A");
    console.log("- Agency Email:", data.agencyEmail || "N/A");

    // 2. Validate required invoice fields
    const requiredFields = [
      "invoiceNumber",
      "invoiceDate",
      "bookingId",
      "customerName",
      "tourTitle",
      "subtotal",
      "gstAmount",
      "grandTotal",
    ];

    const missingFields = requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
      console.error("[API] ✗ Missing required fields:", missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    console.log("\n[API] ✓ All required fields present");

    // 3. Prepare invoice data with formatting
    const invoiceData = prepareInvoiceData(data);

    // 4. Generate PDF
    const pdfBuffer = await generatePDFDocument("invoice", invoiceData);

    // 5. Create filename
    const customerName = (data.customerName || "Customer")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const filename = `invoice-${data.invoiceNumber.replace(/\//g, "-")}-${customerName}.pdf`;

    // 6. Convert to base64
    const pdfBase64 = pdfBuffer.toString("base64");

    console.log("\n[API] ✓ Invoice PDF generated successfully");
    console.log("[API] - Filename:", filename);
    console.log(
      "[API] - PDF Size:",
      (pdfBuffer.length / 1024).toFixed(2),
      "KB",
    );
    console.log("[API] ========== INVOICE REQUEST COMPLETE ==========\n");

    // 7. Return response
    res.status(200).json({
      success: true,
      pdf: pdfBase64,
      filename: filename,
      metadata: {
        type: "invoice",
        invoiceNumber: data.invoiceNumber,
        bookingId: data.bookingId,
        size: pdfBuffer.length,
        customerName: data.customerName,
        grandTotal: data.grandTotal,
      },
    });
  } catch (error) {
    console.error("\n[API] ✗ Invoice generation error:", error.message);
    console.error("[API] Stack trace:", error.stack);
    console.error("[API] ========== INVOICE REQUEST FAILED ==========\n");

    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate invoice PDF",
    });
  }
});

export default router;
