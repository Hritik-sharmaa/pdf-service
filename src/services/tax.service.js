/**
 * Calculate GST and TCS amounts
 */
export function calculateTaxes(totalAmount, includeTcs = true) {
  const TAX_CONFIG = {
    GST_RATE: 0.05,
    TCS_THRESHOLD: 1000000,
    TCS_RATE_BELOW_THRESHOLD: 0.05,
    TCS_RATE_ABOVE_THRESHOLD: 0.2,
  };

  // Calculate GST on subtotal
  const gstAmount = totalAmount * TAX_CONFIG.GST_RATE;

  let tcsBelowThreshold = 0;
  let tcsAboveThreshold = 0;
  let tcsRate = "0%";

  if (includeTcs && totalAmount > 0) {
    // TCS is calculated on (subtotal + GST)
    const tcsBaseAmount = totalAmount + gstAmount;

    if (tcsBaseAmount <= TAX_CONFIG.TCS_THRESHOLD) {
      tcsBelowThreshold = tcsBaseAmount * TAX_CONFIG.TCS_RATE_BELOW_THRESHOLD;
      tcsRate = "5%";
    } else {
      tcsBelowThreshold =
        TAX_CONFIG.TCS_THRESHOLD * TAX_CONFIG.TCS_RATE_BELOW_THRESHOLD;
      tcsAboveThreshold =
        (tcsBaseAmount - TAX_CONFIG.TCS_THRESHOLD) *
        TAX_CONFIG.TCS_RATE_ABOVE_THRESHOLD;
      tcsRate = "5% up to ₹10L, 20% above";
    }
  }

  const tcsAmount = tcsBelowThreshold + tcsAboveThreshold;
  const grandTotal = totalAmount + gstAmount + tcsAmount;

  return {
    gstAmount,
    tcsAmount,
    tcsRate,
    grandTotal,
    tcsBelowThreshold,
    tcsAboveThreshold,
  };
}
