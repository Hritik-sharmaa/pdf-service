import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function generatePDF(html) {
  console.log("[Puppeteer] Launching browser...");

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // Log network requests to debug image loading
    page.on("request", (request) => {
      if (request.resourceType() === "image") {
        console.log("[Puppeteer] Loading image:", request.url());
      }
    });

    page.on("requestfailed", (request) => {
      if (request.resourceType() === "image") {
        console.error(
          "[Puppeteer] Image failed to load:",
          request.url(),
          request.failure()?.errorText,
        );
      }
    });

    console.log("[Puppeteer] Setting page content...");

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    console.log("[Puppeteer] Generating PDF...");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });

    console.log(`[Puppeteer] PDF generated: ${pdf.length} bytes`);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
    console.log("[Puppeteer] Browser closed");
  }
}
