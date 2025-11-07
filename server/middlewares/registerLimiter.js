import rateLimit from "express-rate-limit";

export const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, 
  max: 3, 
  skipFailedRequests: true, 
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      message:
        "Too many accounts created from this IP address today. Please try again after 24 hours.",
    });
  },
});
