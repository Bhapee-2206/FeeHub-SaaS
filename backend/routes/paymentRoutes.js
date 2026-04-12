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
            fromName: instName,
            to: student.email,
            subject: `Payment Receipt: ${payment.receiptNumber || 'FeeHub'} - ${instName}`,
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #334155; background-color: #fff;">
                <div style="background-color: #1e293b; color: white; padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 20px; letter-spacing: 1px;">${instName.toUpperCase()}</h1>
                    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Fee Payment Confirmation</p>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 15px;">Dear <strong>${student.name}</strong>,</p>
                    <p style="font-size: 14px; line-height: 1.6;">Your payment has been successfully recorded at <strong>${instName}</strong>. Please find your transaction summary below:</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr><td style="padding: 5px 0; color: #64748b;">Receipt No:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${payment.receiptNumber || 'N/A'}</td></tr>
                            <tr><td style="padding: 5px 0; color: #64748b;">Date:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})}</td></tr>
                            <tr><td style="padding: 5px 0; color: #64748b;">Method:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${payment.paymentMethod}</td></tr>
                        </table>
                    </div>

                    <h3 style="font-size: 14px; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">Breakdown</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        ${componentsHtml}
                        <tr><td style="padding: 15px 10px; font-weight: bold; font-size: 18px; color: #1e293b;">Total Received</td><td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 18px; color: #10b981;">₹${payment.amount.toLocaleString('en-IN')}</td></tr>
                    </table>

                    <div style="margin-top: 25px; padding: 15px; background-color: #fffaf0; border-left: 4px solid ${dueColor}; border-radius: 4px;">
                        <p style="margin: 0; font-size: 11px; color: #92400e; text-transform: uppercase; font-weight: bold;">Balance Notification</p>
                        <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: bold; color: ${dueColor};">Current Due Balance: ${dueText}</p>
                    </div>

                    <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        This is an official transactional email from <strong>${instName}</strong> via FeeHub Cloud.<br>
                        If you have questions about this payment, please contact the institution directly.
                    </p>
                </div>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 10px; color: #94a3b8;">
                    FeeHub Workspace &bull; Secure Payment Processing &bull; ${new Date().getFullYear()}
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
