import jwt from 'jsonwebtoken';

export const ROLE_LEVEL = { viewer: 1, editor: 2, admin: 3 };

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

function requireRole(minRole) {
  const minLevel = ROLE_LEVEL[minRole];
  return function (req, res, next) {
    const level = ROLE_LEVEL[req.user?.role] || 0;
    if (level < minLevel) {
      return res.status(403).json({ error: `Requires ${minRole} access (Lv.${minLevel}) or higher` });
    }
    next();
  };
}

// Lv.2+ — view, edit, and add/delete products
export const requireEditor = requireRole('editor');

// Lv.3 — everything, including user management
export const requireAdmin = requireRole('admin');
