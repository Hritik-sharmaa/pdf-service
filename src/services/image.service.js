/**
 * Transform internal URLs to be accessible by Puppeteer
 */
export function transformImageUrls(templateData) {
  const publicUrl = process.env.PUBLIC_STORAGE_URL || "http://127.0.0.1:54321";
  const internalHost = "kong:8000";

  // Transform banner image URL
  if (
    templateData.bannerImageUrl &&
    typeof templateData.bannerImageUrl === "string" &&
    templateData.bannerImageUrl.includes(internalHost)
  ) {
    templateData.bannerImageUrl = templateData.bannerImageUrl.replace(
      `http://${internalHost}`,
      publicUrl,
    );
    console.log("[Images] ✓ Banner URL transformed");
  }

  // Transform package images URLs
  if (templateData.packageImages && Array.isArray(templateData.packageImages)) {
    const originalCount = templateData.packageImages.length;

    templateData.packageImages = templateData.packageImages.map((url) => {
      if (typeof url === "string" && url.includes(internalHost)) {
        return url.replace(`http://${internalHost}`, publicUrl);
      }
      return url;
    });

    console.log(`[Images] ✓ Transformed ${originalCount} package images`);
  }

  return templateData;
}
