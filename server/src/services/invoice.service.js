import PDFDocument from 'pdfkit';

export const invoiceService = {
  createInvoicePdf({ bill, flat, society, payment }) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Society Management Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(society.name);
      doc.fontSize(10).text(`${society.address.line1}, ${society.address.city}, ${society.address.state} ${society.address.pincode}`);
      doc.moveDown();

      doc.fontSize(12).text(`Invoice ID: ${bill._id}`);
      doc.text(`Billing Period: ${bill.billingPeriod}`);
      doc.text(`Flat: ${flat.flatNumber}`);
      doc.text(`Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}`);
      doc.text(`Status: ${bill.status.toUpperCase()}`);
      if (bill.paidOn) doc.text(`Paid On: ${new Date(bill.paidOn).toLocaleDateString('en-IN')}`);
      doc.moveDown();

      doc.fontSize(13).text('Line Items');
      doc.moveTo(48, doc.y + 4).lineTo(547, doc.y + 4).stroke();
      doc.moveDown(0.5);

      bill.lineItems.forEach((item) => {
        doc.fontSize(11).text(item.description, { continued: true });
        doc.text(`INR ${item.amount.toFixed(2)}`, { align: 'right' });
      });

      doc.moveTo(48, doc.y + 6).lineTo(547, doc.y + 6).stroke();
      doc.moveDown();
      doc.fontSize(14).text(`Total: INR ${bill.totalAmount.toFixed(2)}`, { align: 'right' });

      if (payment) {
        doc.moveDown();
        doc.fontSize(12).text('Payment Details');
        doc.fontSize(10).text(`Payment ID: ${payment.razorpayPaymentId || payment._id}`);
        doc.text(`Order ID: ${payment.razorpayOrderId}`);
        doc.text(`Method: ${payment.method || 'N/A'}`);
      }

      doc.moveDown(2);
      doc.fontSize(9).text('This is a system-generated invoice/receipt.', { align: 'center' });
      doc.end();
    });
  }
};
