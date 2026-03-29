
const express = require('express');
const router = express.Router();

const { 
    registerInstitution, 
    loginUser, 
    forgotPassword, 
    resetPassword,
    studentLogin 
} = require('../controllers/authController');

router.post('/register', registerInstitution);
router.post('/login', loginUser);
router.post('/student-login', studentLogin); 

router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;
