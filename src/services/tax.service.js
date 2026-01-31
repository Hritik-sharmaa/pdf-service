/**
 * Calculate GST and TCS amounts
 */
export function calculateTaxes(totalAmount, includeTcs) {
  const gstAmount = totalAmount * 0.05;
  let tcsAmount = 0;
  let tcsRate = "0%";

  if (includeTcs) {
    const TCS_THRESHOLD = 1000000;

    if (totalAmount <= TCS_THRESHOLD) {
      tcsAmount = totalAmount * 0.05;
      tcsRate = "5%";
    } else {
      const tcsBelowThreshold = TCS_THRESHOLD * 0.05;
      const tcsAboveThreshold = (totalAmount - TCS_THRESHOLD) * 0.2;
      tcsAmount = tcsBelowThreshold + tcsAboveThreshold;
      tcsRate = "5% + 20%";
    }
  }

  const grandTotal = totalAmount + gstAmount + tcsAmount;

  return { gstAmount, tcsAmount, tcsRate, grandTotal };
}
