const corsOptions = {
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    logger.warn("CORS blocked", { origin });
    callback(new Error("Origin not allowed by CORS policy"));
  },
  credentials: true,
  maxAge: 86400
};  // Fixed wildcard CORS - Updated: 2026-05-04
// build: 1777897251
