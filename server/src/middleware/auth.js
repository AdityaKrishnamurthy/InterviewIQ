const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Get token from header (either Authorization: Bearer <token> or x-auth-token)
  let token = req.header('x-auth-token');
  const authHeader = req.header('Authorization');

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret_interviewiq';
    const decoded = jwt.verify(token, secret);
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

module.exports = authMiddleware;
