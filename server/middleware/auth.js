// Authentication middleware

// Check if user is logged in
export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.employee) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Check if user has required role(s)
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.employee) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userRole = req.session.employee.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
