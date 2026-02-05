import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

// Register Handlebars helpers
Handlebars.registerHelper("formatINR", function (amount) {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `₹${formatted}`;
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
    .replace(/&apos;/g, "'");

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
});

// Helper to split itinerary into chunks for pagination
Handlebars.registerHelper("splitItinerary", function (itinerary, options) {
  if (!itinerary || itinerary.length === 0) {
    return options.fn({ days: [], hasMore: false, isFirst: true });
  }

  // Estimate content height based on description length
  // Average characters per line: ~80-100 for the small font (6pt)
  // Lines per day item: title (1 line) + description lines + spacing
  const estimateHeight = (day) => {
    const titleHeight = 1.2; // lines (including margin)
    const descLength = day.description ? day.description.length : 0;
    const descLines = Math.ceil(descLength / 110); // ~110 chars per line for small font
    const spacing = 0.3; // gap between items
    return titleHeight + descLines + spacing;
  };

  // First page constraints (with left column taking ~40% width)
  // Right column has 2 sub-columns for days
  // Available height: ~50-55 lines total in 2 columns
  const firstPageMaxLines = 55;

  // Continuation page constraints (SAME as first page - also has left column)
  // Same layout, same capacity
  const continuationPageMaxLines = 55;

  let result = "";
  let currentIndex = 0;

  // First page chunk - dynamically calculate based on content
  if (currentIndex < itinerary.length) {
    let firstChunk = [];
    let totalLines = 0;

    for (let i = 0; i < itinerary.length; i++) {
      const dayHeight = estimateHeight(itinerary[i]);

      // Account for 2-column layout (divide by 2)
      if (totalLines + dayHeight <= firstPageMaxLines) {
        firstChunk.push(itinerary[i]);
        totalLines += dayHeight;
      } else {
        break;
      }
    }

    // Safety bounds: minimum 5 days, maximum 12 days
    if (firstChunk.length < 5 && itinerary.length >= 5) {
      firstChunk = itinerary.slice(0, 5);
    }
    if (firstChunk.length > 12) {
      firstChunk = itinerary.slice(0, 12);
    }

    // If all remaining days can fit (13 or fewer total), include them all
    if (itinerary.length <= 13) {
      firstChunk = itinerary;
    }

    const hasMore = itinerary.length > firstChunk.length;

    result += options.fn({
      days: firstChunk,
      hasMore: hasMore,
      isFirst: true,
      isContinuation: false,
    });

    currentIndex = firstChunk.length;
  }

  // Continuation pages - dynamically calculate based on content
  while (currentIndex < itinerary.length) {
    let chunk = [];
    let totalLines = 0;
    const remainingDays = itinerary.length - currentIndex;

    // Calculate total lines for all remaining days
    let remainingTotalLines = 0;
    for (let i = currentIndex; i < itinerary.length; i++) {
      remainingTotalLines += estimateHeight(itinerary[i]);
    }

    // If all remaining days can fit on one page, include them all
    if (remainingTotalLines <= continuationPageMaxLines || remainingDays <= 7) {
      chunk = itinerary.slice(currentIndex);
    } else {
      // Otherwise, fit as many as possible
      for (let i = currentIndex; i < itinerary.length; i++) {
        const dayHeight = estimateHeight(itinerary[i]);

        if (totalLines + dayHeight <= continuationPageMaxLines) {
          chunk.push(itinerary[i]);
          totalLines += dayHeight;
        } else {
          break;
        }
      }

      // Safety bounds: minimum 5 days, maximum 12 days
      if (chunk.length < 5 && currentIndex + 5 <= itinerary.length) {
        chunk = itinerary.slice(currentIndex, currentIndex + 5);
      }
      if (chunk.length > 12) {
        chunk = itinerary.slice(currentIndex, currentIndex + 12);
      }
    }

    // If no items fit, take at least one to avoid infinite loop
    if (chunk.length === 0 && currentIndex < itinerary.length) {
      chunk = [itinerary[currentIndex]];
    }

    const hasMore = currentIndex + chunk.length < itinerary.length;

    result += options.fn({
      days: chunk,
      hasMore: hasMore,
      isFirst: false,
      isContinuation: true,
    });

    currentIndex += chunk.length;
  }

  return result;
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
