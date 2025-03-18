const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/token");

const blackListedToken = new Set();

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token; // Read token from cookies

  if (!token) {
    return res.status(401).json({ message: "Access denied. Sign in again!" });
  }

  if (blackListedToken.has(token)) {
    return res
      .status(403)
      .json({ message: "Token has expired. Sign in again!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - currentTime;

    console.log("Token is about to expire in " + timeLeft + "s");

    if (timeLeft < 60) {
      // Token is about to expire, generate a new one
      const payload = { id: decoded.id };
      const newToken = generateToken(payload);

      // Blacklist the old token
      blackListedToken.add(token);

      // Set new token in cookie
      res.cookie("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 24 * 60 * 60 * 1000, // 1-day expiration
      });

      req.token = newToken;
    }

    req.id = decoded.id;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      const decoded = jwt.decode(token);
      if (!decoded) {
        return res.status(403).json({ message: "Invalid token." });
      }

      const expirationTime = decoded.exp;
      const tokenInterval = parseInt(process.env.TOKEN_INTERVAL, 10) || 3600;

      if (expirationTime + tokenInterval > Math.floor(Date.now() / 1000)) {
        console.log("Token expired but within interval, regenerating token.");
        const payload = { id: decoded.id };
        const newToken = generateToken(payload);

        // Blacklist old token
        blackListedToken.add(token);

        // Set new token in cookie
        res.cookie("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
          maxAge: 24 * 60 * 60 * 1000, // 1-day expiration
        });

        req.token = newToken;
        req.id = decoded.id;
        return next();
      }
    }

    return res.status(403).json({
      message: "Invalid or expired token. Sign in again!",
      error: error.message,
    });
  }
};

module.exports = verifyToken;
