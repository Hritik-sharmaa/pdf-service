import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

// Register Handlebars helpers
Handlebars.registerHelper("formatINR", function (amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
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
