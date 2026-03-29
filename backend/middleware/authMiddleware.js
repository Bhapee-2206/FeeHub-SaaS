
const jwt = require('jsonwebtoken');
const User = require('../models/user'); 
const Student = require('../models/student'); 

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            
            if (decoded.role === 'Student') {
                req.user = await Student.findById(decoded.id);
                if (req.user) req.user.role = 'Student'; 
            } else {
                req.user = await User.findById(decoded.id).select('-password');
            }
            
            if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
            
            next(); 
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };
