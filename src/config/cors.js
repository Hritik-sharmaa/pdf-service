/**
 * CORS Configuration
 */
export function configureCors() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

  return {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.some((allowed) => origin.includes(allowed))
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  };
}

export function getAllowedOrigins() {
  return process.env.ALLOWED_ORIGINS?.split(",") || ["*"];
}
