import { sendEmail } from "../../utils/email.js";

/**
 * Generate email subject based on document type
 */
export function generateEmailSubject(
  type,
  tourTitle,
  voucherNumber,
  isAgentCopy = false,
) {
  const prefix = isAgentCopy ? "[Agent Copy] " : "";

  if (type === "booking-voucher") {
    return `${prefix}Booking Confirmed - ${tourTitle} | Voucher #${voucherNumber}`;
  } else if (type === "quote") {
    return `${prefix}Your Travel Quote - ${tourTitle} | Quote #${voucherNumber}`;
  }

  return `${prefix}${tourTitle} - ${voucherNumber}`;
}

/**
 * Customize email HTML for agent
 */
export function customizeAgentEmail(
  emailHtml,
  customerName,
  agencyName,
  customerPhone,
  isBookingVoucher,
) {
  const customerGreeting = `Dear <strong>${customerName}</strong>`;
  const agentGreeting = `Dear <strong>${agencyName}</strong>`;

  const customerMessage = isBookingVoucher
    ? "Thank you for choosing Cox & Kings! Your booking has been confirmed successfully."
    : "Thank you for your interest in traveling with us! We have prepared a detailed quote for your dream vacation.";

  const agentMessage = isBookingVoucher
    ? `A booking has been confirmed for your customer <strong>${customerName}</strong> (${customerPhone || "N/A"}).`
    : `A quote has been generated for your customer <strong>${customerName}</strong> (${customerPhone || "N/A"}).`;

  return emailHtml
    .replace(customerGreeting, agentGreeting)
    .replace(customerMessage, agentMessage);
}

/**
 * Send email to customer
 */
export async function sendCustomerEmail(
  customerEmail,
  type,
  tourTitle,
  voucherNumber,
  emailHtml,
  pdfAttachment,
) {
  if (!customerEmail) {
    return { success: false, skipped: true };
  }

  const subject = generateEmailSubject(type, tourTitle, voucherNumber);

  const result = await sendEmail({
    to: customerEmail,
    subject,
    html: emailHtml,
    attachments: [pdfAttachment],
  });

  if (result.success) {
    console.log(`[Email] ✓ Sent to customer: ${customerEmail}`);
  } else {
    console.error(`[Email] ✗ Failed to send to customer: ${result.error}`);
  }

  return result;
}

/**
 * Send email to agent
 */
export async function sendAgentEmail(
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
) {
  if (!agentEmail) {
    return { success: false, skipped: true };
  }

  const subject = generateEmailSubject(type, tourTitle, voucherNumber, true);
  const agentEmailHtml = customizeAgentEmail(
    emailHtml,
    customerName,
    agencyName,
    customerPhone,
    isBookingVoucher,
  );

  const result = await sendEmail({
    to: agentEmail,
    subject,
    html: agentEmailHtml,
    attachments: [pdfAttachment],
  });

  if (result.success) {
    console.log(`[Email] ✓ Sent to agent: ${agentEmail}`);
  } else {
    console.error(`[Email] ✗ Failed to send to agent: ${result.error}`);
  }

  return result;
}
