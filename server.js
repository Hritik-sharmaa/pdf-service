import "dotenv/config";
import express from "express";
import cors from "cors";
import { configureCors, getAllowedOrigins } from "./src/config/cors.js";
import { errorHandler } from "./src/middleware/error.middleware.js";
import healthRoutes from "./src/routes/health.routes.js";
import pdfRoutes from "./src/routes/pdf.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ limit: "10mb" }));
app.use(cors(configureCors()));

// ============================================
// ROUTES
// ============================================

app.use("/", healthRoutes);
app.use("/api", pdfRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

app.listen(PORT, () => {
  console.log("");
  console.log("🚀 Cox & Kings PDF Service");
  console.log("================================");
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API endpoint: http://localhost:${PORT}/api/generate-pdf`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log("");
  console.log(
    "📧 Gmail configured:",
    process.env.GMAIL_USER || "Not configured",
  );
  console.log("🔒 CORS origins:", getAllowedOrigins().join(", "));
  console.log("");
  console.log("Ready to generate PDFs! 📄");
  console.log("================================");
  console.log("");
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully...");
  process.exit(0);
});
