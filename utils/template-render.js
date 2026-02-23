import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

// Register Handlebars helpers
Handlebars.registerHelper("formatINR", function (amount) {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}`;
});

Handlebars.registerHelper("formatINRPlain", function (amount) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
});

Handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

Handlebars.registerHelper("gt", function (a, b) {
  return a > b;
});

Handlebars.registerHelper("add", function (a, b) {
  return a + b;
});

Handlebars.registerHelper("multiply", function (a, b) {
  return Math.round(a * b);
});

Handlebars.registerHelper("formatBrandTag", function (brandTag) {
  if (!brandTag) return "";

  // Convert BHARAT_DEKO or DUNIYA_DEKHO to Bharat Deko / Duniya Dekho
  return brandTag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
});

Handlebars.registerHelper("formatDate", function (dateString) {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }

    // Format as: February 21, 2026
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
});

Handlebars.registerHelper("stripHtml", function (text) {
  if (!text) return "";

  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, "");

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&middot;/g, "•")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    .replace(/&hellip;/g, "…");

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
});

Handlebars.registerHelper("decodeHtmlEntities", function (text) {
  if (!text) return "";

  // Decode HTML entities
  let decoded = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&middot;/g, "•")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    .replace(/&hellip;/g, "…");

  return decoded;
});

Handlebars.registerHelper("isArray", function (value) {
  return Array.isArray(value);
});

// Helper to JSON-serialize data for client-side dynamic pagination
// Handles strings, arrays, objects, null/undefined safely
// Also escapes </script to prevent premature script tag termination
Handlebars.registerHelper("jsonStringify", function (value) {
  if (value === undefined || value === null) {
    return new Handlebars.SafeString("null");
  }
  // Escape </script sequences to prevent breaking the HTML script tag
  const json = JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
  return new Handlebars.SafeString(json);
});

export function renderTemplate(templateName, data) {
  console.log(`[Template] Rendering: ${templateName}`);
  console.log(`[Template] bannerImageUrl:`, data.bannerImageUrl);
  console.log(`[Template] Has bannerImageUrl:`, !!data.bannerImageUrl);
  console.log(`[Template] departureStartDate:`, data.departureStartDate);
  console.log(`[Template] departureEndDate:`, data.departureEndDate);
  console.log(`[Template] currentYear:`, data.currentYear);

  const templatePath = join(process.cwd(), "templates", `${templateName}.html`);
  const templateContent = readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(templateContent);

  return template(data);
}
