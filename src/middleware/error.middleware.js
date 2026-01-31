/**
 * Global error handling middleware
 */
export function errorHandler(err, _, res, __) {
  console.error("[Server] Error:", err);

  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
}
