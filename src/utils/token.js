const jwt = require("jsonwebtoken");

const generateToken = (payload) => {
  const token_secret = process.env.TOKEN_SECRET;
  const token_duration = process.env.TOKEN_DURATION;
  return jwt.sign(payload, token_secret, {
    expiresIn: token_duration,
  });
};

module.exports = {
  generateToken,
};
