import express from "express";

const router = express.Router();

/**
 * Root endpoint - Service information
 */
router.get("/", (_, res) => {
  res.json({
    service: "Cox & Kings PDF Generation Service",
    status: "running",
    version: "1.0.0",
    endpoints: {
      generatePdf: "POST /api/generate-pdf",
      health: "GET /health",
    },
  });
});

/**
 * Health check endpoint
 */
router.get("/health", (_, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;
