import { execSync } from "child_process";

/**
 * Detect environment and get appropriate Puppeteer configuration
 */
async function getPuppeteerConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const isRailway = process.env.RAILWAY_ENVIRONMENT;
  const isVercel = process.env.VERCEL;
  const isLocal = !isProduction && !isRailway && !isVercel;

  console.log("[Puppeteer] Environment:", {
    isLocal,
    isRailway,
    isVercel,
    isProduction,
  });

  // Mode 1: Local development - use bundled Chromium
  if (isLocal) {
    try {
      const puppeteerFull = await import("puppeteer");
      console.log("[Puppeteer] Using bundled Chromium (local dev)");
      return {
        puppeteer: puppeteerFull.default,
        launchOptions: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
          ],
        },
      };
    } catch (e) {
      console.log(
        "[Puppeteer] Full puppeteer not found, falling back to system Chrome",
      );
    }
  }

  // Mode 2: Vercel/Serverless - use @sparticuz/chromium
  if (isVercel) {
    try {
      const puppeteerCore = await import("puppeteer-core");
      const chromium = await import("@sparticuz/chromium");

      console.log("[Puppeteer] Using @sparticuz/chromium (serverless)");

      return {
        puppeteer: puppeteerCore.default,
        launchOptions: {
          args: chromium.default.args,
          defaultViewport: chromium.default.defaultViewport,
          executablePath: await chromium.default.executablePath(),
          headless: chromium.default.headless,
        },
      };
    } catch (e) {
      console.error("[Puppeteer] Failed to load @sparticuz/chromium:", e);
    }
  }

  // Mode 3: Railway/Docker - use system Chromium
  const puppeteerCore = await import("puppeteer-core");
  console.log("[Puppeteer] Using system Chromium (Railway/Docker)");

  return {
    puppeteer: puppeteerCore.default,
    launchOptions: {
      headless: true,
      executablePath: findSystemChrome(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  };
}

/**
 * Find system Chrome/Chromium executable path
 */
function findSystemChrome() {
  // 1. Check environment variable first
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(
      "[Puppeteer] Using executable from env:",
      process.env.PUPPETEER_EXECUTABLE_PATH,
    );
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. Try common paths based on platform
  const possiblePaths = [];

  if (process.platform === "linux") {
    possiblePaths.push(
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/snap/bin/chromium",
    );
  } else if (process.platform === "darwin") {
    // macOS
    possiblePaths.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else if (process.platform === "win32") {
    // Windows
    possiblePaths.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    );
  }

  // 3. Try to find using 'which' command (Linux/Mac)
  if (process.platform !== "win32") {
    try {
      const whichChrome = execSync(
        "which google-chrome || which chromium || which chromium-browser",
        {
          encoding: "utf8",
        },
      ).trim();
      if (whichChrome) {
        possiblePaths.unshift(whichChrome);
      }
    } catch (e) {
      // Ignore if 'which' fails
    }
  }

  // 4. Check each path
  const fs = require("fs");
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log("[Puppeteer] Found Chrome at:", path);
        return path;
      }
    } catch (e) {
      // Continue checking
    }
  }

  throw new Error(
    "Could not find Chrome/Chromium. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH environment variable.",
  );
}

export async function generatePDF(html) {
  console.log("[Puppeteer] Launching browser...");

  const { puppeteer, launchOptions } = await getPuppeteerConfig();

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

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
