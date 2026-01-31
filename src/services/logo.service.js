import { readFileSync } from "fs";
import { join } from "path";

/**
 * Load Cox & Kings logo as base64 from file
 */
export function loadLogoBase64() {
  try {
    const logoPath = join(process.cwd(), "utils", "logo-base64.ts");
    const logoContent = readFileSync(logoPath, "utf-8");
    const match = logoContent.match(
      /export const COX_KINGS_LOGO_BASE64 = "(.+)";/,
    );

    if (match) {
      console.log("[Logo] ✓ Logo loaded successfully");
      return match[1];
    }

    console.warn("[Logo] ⚠ Could not extract logo from file");
    return "";
  } catch (error) {
    console.error("[Logo] ✗ Error reading logo:", error.message);
    return "";
  }
}
