const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Payment = require('../models/Payment');
const Student = require('../models/student');
const Institution = require('../models/institution');
const { sendEmail } = require('../utils/emailService');

async function sendReceiptEmail(payment, student, instName) {
    try {
        const dueBalance = Math.max(0, student.totalFees - student.paid);
        const dueColor = dueBalance > 0 ? '#ef4444' : '#10b981';
        const dueText = dueBalance > 0 ? `₹${dueBalance.toLocaleString('en-IN')}` : 'Account Cleared (No Dues)';

        let componentsHtml = '';
        if (payment.components && payment.components.length > 0) {
            payment.components.forEach(c => {
                componentsHtml += `<tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">${c.name}</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">₹${c.amount.toLocaleString('en-IN')}</td></tr>`;
            });
        } else {
            componentsHtml += `<tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">Academic Fee Payment</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">₹${(payment.amount - (payment.fine || 0)).toLocaleString('en-IN')}</td></tr>`;
        }

        if (payment.fine > 0) {
            componentsHtml += `<tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #ef4444;">Late Fee / Fine</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #ef4444;">₹${payment.fine.toLocaleString('en-IN')}</td></tr>`;
        }

        const mailOptions = {
            from: `"${instName}" <${process.env.EMAIL_USER}>`,
            to: student.email,
            subject: `Payment Receipt: ${payment.receiptNumber || 'FeeHub'} - ${instName}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">${instName.toUpperCase()}</h1>
                    <p style="margin: 5px 0 0 0; color: #cbd5e1;">Official Payment Receipt</p>
                </div>
                <div style="padding: 20px;">
                    <p>Dear <strong>${student.name}</strong>,</p>
                    <p>We have successfully received your fee payment. Below are the details of your transaction:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                        <tr><td style="padding: 5px 0; color: #64748b;">Receipt No:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${payment.receiptNumber || 'N/A'}</td></tr>
                        <tr><td style="padding: 5px 0; color: #64748b;">Date:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('en-IN')}</td></tr>
                        <tr><td style="padding: 5px 0; color: #64748b;">Mode:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${payment.paymentMethod}</td></tr>
                    </table>

                    <h3 style="margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Fee Breakdown</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        ${componentsHtml}
                        <tr><td style="padding: 12px 8px; font-weight: bold; font-size: 16px;">Total Paid</td><td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #10b981;">₹${payment.amount.toLocaleString('en-IN')}</td></tr>
                    </table>

                    <div style="margin-top: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid ${dueColor}; border-radius: 4px;">
                        <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Account Summary</p>
                        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: ${dueColor};">Current Due Balance: ${dueText}</p>
                    </div>

                    <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">This is a computer-generated receipt.</p>
                </div>
            </div>`
        };

        await sendEmail(mailOptions);
        return true;
    } catch (e) {
        console.error("Email error:", e);
        return false;
    }
}


router.get('/', protect, async (req, res) => {
    try {
        const payments = await Payment.find({ institutionId: req.user.institutionId })
            .populate('studentId')
            .sort({ paymentDate: -1, createdAt: -1 });
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


router.post('/', protect, async (req, res) => {
    try {
        const { studentId, academicAmount, fineAmount, method, remarks, manualReceipt, transactionId, paymentDate, components, sendEmail } = req.body;

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        let finalReceipt = manualReceipt;
        if (!finalReceipt) {
            const count = await Payment.countDocuments({ institutionId: req.user.institutionId });
            finalReceipt = `FH-${new Date().getFullYear()}-${count + 101}`;
        }

        const totalAmount = academicAmount + (fineAmount || 0);

        const newPayment = await Payment.create({
            institutionId: req.user.institutionId,
            studentId,
            amount: totalAmount,
            fine: fineAmount || 0,
            paymentMethod: method,
            transactionId: transactionId || '',
            receiptNumber: finalReceipt,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            remarks: remarks || '',
            components: components || [],
            recordedBy: req.user._id
        });
        student.paid += academicAmount;
        await student.save();

        
        if (sendEmail === true && student.email) {
            const institution = await Institution.findById(req.user.institutionId);
            const instName = institution ? institution.name : 'FeeHub Institution';
            sendReceiptEmail(newPayment, student, instName).catch(err => console.error('Email send failed:', err));
        }

        res.status(201).json({ success: true, data: newPayment, message: 'Payment recorded. Email will be sent shortly.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


router.post('/email-receipt/:id', protect, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id).populate('studentId');
        if (!payment || !payment.studentId || !payment.studentId.email) {
            return res.status(400).json({ success: false, message: 'Student email not found.' });
        }

        const institution = await Institution.findById(req.user.institutionId);
        const instName = institution ? institution.name : 'FeeHub Institution';

        sendReceiptEmail(payment, payment.studentId, instName).catch(err => console.error('Email send failed:', err));

        res.json({ success: true, message: 'Receipt email will be sent shortly!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


router.delete('/:id', protect, async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Payment deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
