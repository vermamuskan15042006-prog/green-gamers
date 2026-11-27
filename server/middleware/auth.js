import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'green_gamers_dev_secret_key';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

export default authMiddleware;
