import { generatePDF } from "../../utils/puppeteer.js";
import { renderTemplate } from "../../utils/template-render.js";
import { loadLogoBase64 } from "./logo.service.js";
import { calculateTaxes } from "./tax.service.js";
import { transformImageUrls } from "./image.service.js";

/**
 * Prepare template data with all required fields
 */
export function prepareTemplateData(data) {
  // Calculate taxes
  const { gstAmount, tcsAmount, tcsRate, grandTotal } = calculateTaxes(
    data.totalAmount,
    data.includeTcs,
  );

  // Load logo
  const COX_KINGS_LOGO_BASE64 = loadLogoBase64();

  // Prepare base template data
  let templateData = {
    ...data,
    gstAmount,
    tcsAmount,
    tcsRate,
    grandTotal,
    COX_KINGS_LOGO_BASE64,
    currentYear: new Date().getFullYear(),
  };

  // Transform image URLs
  templateData = transformImageUrls(templateData);

  // Log agency information
  console.log("[PDF] Agency Information:", {
    agencyName: templateData.agencyName || "NOT PROVIDED",
    agencyEmail: templateData.agencyEmail || "NOT PROVIDED",
    agencyPhone: templateData.agencyPhone || "NOT PROVIDED",
  });

  // Log inclusions/exclusions data
  console.log("[PDF] Inclusions/Exclusions Data:", {
    inclusions: templateData.inclusions
      ? `Array(${templateData.inclusions.length})`
      : "NOT PROVIDED",
    exclusions: templateData.exclusions
      ? `Array(${templateData.exclusions.length})`
      : "NOT PROVIDED",
    tourInclusions: templateData.tourInclusions || "NOT PROVIDED",
  });

  // Detailed tourInclusions logging
  if (templateData.tourInclusions) {
    console.log(
      "[PDF] tourInclusions details:",
      JSON.stringify(templateData.tourInclusions, null, 2),
    );
  } else {
    console.log("[PDF] ⚠️ tourInclusions is missing from the data");
  }

  console.log(
    `[PDF] ✓ Template data prepared with ${Object.keys(templateData).length} keys`,
  );

  return templateData;
}

/**
 * Generate PDF from template data
 */
export async function generatePDFDocument(type, templateData) {
  console.log(`[PDF] Generating ${type} PDF...`);

  // Render HTML template
  const html = renderTemplate(type, templateData);

  // Generate PDF
  const pdfBuffer = await generatePDF(html);

  console.log(
    `[PDF] ✓ PDF generated: ${(pdfBuffer.length / 1024).toFixed(2)} KB`,
  );

  return pdfBuffer;
}

/**
 * Create PDF attachment object
 */
export function createPDFAttachment(type, voucherNumber, pdfBuffer) {
  const filename = `${type}-${voucherNumber || Date.now()}.pdf`;

  return {
    filename,
    content: pdfBuffer,
    contentType: "application/pdf",
  };
}

/**
 * Convert number to words (Indian numbering system)
 */
function numberToWords(num) {
  if (num === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertLessThanThousand(n) {
    if (n === 0) return "";

    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
      );
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
    );
  }

  // Handle decimal part
  const parts = num.toString().split(".");
  const integerPart = parseInt(parts[0]);
  const decimalPart = parts[1] ? parseInt(parts[1].substring(0, 2)) : 0;

  let result = "";

  // Indian numbering system: Crores, Lakhs, Thousands, Hundreds
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  if (crore > 0) result += convertLessThanThousand(crore) + " Crore ";
  if (lakh > 0) result += convertLessThanThousand(lakh) + " Lakh ";
  if (thousand > 0) result += convertLessThanThousand(thousand) + " Thousand ";
  if (remainder > 0) result += convertLessThanThousand(remainder);

  result = result.trim();

  // Add paise if decimal part exists
  if (decimalPart > 0) {
    result += " and " + convertLessThanThousand(decimalPart) + " Paise";
  }

  return result || "Zero";
}

/**
 * Prepare invoice template data with formatted dates and calculations
 */
export function prepareInvoiceData(data) {
  console.log("[PDF] Preparing invoice data...");

  // Load logo
  const COX_KINGS_LOGO_BASE64 = loadLogoBase64();

  // Format dates for display
  const formatDate = (isoDate) => {
    if (!isoDate) return "N/A";
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format payments array with formatted dates
  const formattedPayments = (data.payments || []).map((payment) => ({
    ...payment,
    paidDate: formatDate(payment.paidDate),
    amount: Number(payment.amount).toFixed(2),
  }));

  // Convert grand total to words
  const grandTotalInWords = numberToWords(Number(data.grandTotal));

  // Calculate package total (subtotal + GST, before TCS)
  const packageTotal = Number(data.subtotal) + Number(data.gstAmount);

  // Prepare invoice template data
  const invoiceData = {
    ...data,
    // Formatted dates
    invoiceDate: formatDate(data.invoiceDate),
    bookingDate: formatDate(data.bookingDate),
    departureDate: formatDate(data.departureDate),
    endDate: formatDate(data.endDate),
    currentDate: formatDate(new Date().toISOString()),

    // Formatted amounts (ensure 2 decimal places)
    subtotal: Number(data.subtotal).toFixed(2),
    gstAmount: Number(data.gstAmount).toFixed(2),
    tcsAmount: Number(data.tcsAmount || 0).toFixed(2),
    grandTotal: Number(data.grandTotal).toFixed(2),
    packageTotal: packageTotal.toFixed(2), // Package price before TCS
    grandTotalInWords: grandTotalInWords,

    // Split GST into CGST and SGST (50% each)
    gstRate: data.gstRate || 5,
    cgstRate: ((data.gstRate || 5) / 2).toFixed(1),
    sgstRate: ((data.gstRate || 5) / 2).toFixed(1),
    cgstAmount: (Number(data.gstAmount) / 2).toFixed(2),
    sgstAmount: (Number(data.gstAmount) / 2).toFixed(2),

    // Formatted payments
    payments: formattedPayments,

    // Logo
    COX_KINGS_LOGO_BASE64,

    // Current year for footer
    currentYear: new Date().getFullYear(),

    // Ensure default values
    sacCode: data.sacCode || "998552",
    includeTcs: data.includeTcs || false,
    paymentType: data.paymentType || "one_time",
  };

  console.log("[PDF] Invoice data prepared:", {
    invoiceNumber: invoiceData.invoiceNumber,
    customerName: invoiceData.customerName,
    tourTitle: invoiceData.tourTitle,
    grandTotal: invoiceData.grandTotal,
    paymentsCount: formattedPayments.length,
    hasAgency: !!invoiceData.agencyName,
  });

  return invoiceData;
}
