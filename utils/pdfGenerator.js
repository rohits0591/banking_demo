const PDFDocument = require('pdfkit');
const moment = require('moment');

async function generatePDFStatement({ customer, customerId, transactions, fromDate, toDate }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4'
      });

      // Buffer to collect PDF data
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header with bank branding
      const bankName = 'SIMPLECITY BANK';
      const bankTagline = 'Your Trusted Banking Partner';

      // Top banner background
      doc.rect(0, 0, doc.page.width, 80).fill('#1F4788');
      
      // Bank name and tagline
      doc.fillColor('#FFFFFF');
      doc.fontSize(24).font('Helvetica-Bold').text(bankName, 50, 20);
      doc.fontSize(10).font('Helvetica').text(bankTagline, 50, 48);
      
      // Contact info in header
      doc.fontSize(8).text('Customer Support: 1-800-BANK-123 | Email: support@simplecitybank.com', 50, 60);

      // Reset color and spacing
      doc.fillColor('#000000');
      doc.moveTo(40, 85).lineTo(doc.page.width - 40, 85).stroke('#CCCCCC');

      // Title
      doc.fontSize(14).font('Helvetica-Bold').text('ACCOUNT STATEMENT', 50, 100);

      // Statement period info
      doc.fontSize(9).font('Helvetica');
      const statementDate = moment().format('DD/MM/YYYY HH:mm:ss');
      doc.text(`Statement Period: ${fromDate.format('DD/MM/YYYY')} to ${toDate.format('DD/MM/YYYY')}`, 50, 125);
      doc.text(`Generated On: ${statementDate}`, 50, 140);

      // Customer info section
      doc.moveTo(40, 155).lineTo(doc.page.width - 40, 155).stroke('#CCCCCC');
      
      doc.fontSize(10).font('Helvetica-Bold').text('ACCOUNT DETAILS', 50, 165);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Customer ID: ${customerId}`, 50, 182);
      doc.text(`Account Holder: ${customer.name}`, 50, 198);
      doc.text(`Email: ${customer.email}`, 50, 214);
      doc.text(`Mobile: ${customer.mobile}`, 50, 230);
      doc.text(`Account Type: ${customer.customerType}`, 280, 182);
      doc.text(`Account Status: ${customer.accountStatus}`, 280, 198);
      doc.text(`Account No: ${customer.accountNumber}`, 280, 214);
      doc.text(`IFSC Code: ${customer.ifscCode}`, 280, 230);

      // Account Summary section
      doc.moveTo(40, 245).lineTo(doc.page.width - 40, 245).stroke('#CCCCCC');
      
      doc.fontSize(10).font('Helvetica-Bold').text('ACCOUNT SUMMARY', 50, 255);
      
      // Summary box
      doc.rect(50, 270, doc.page.width - 100, 60).stroke('#CCCCCC');
      
      doc.fontSize(9).font('Helvetica').text(`Opening Balance: ₹ ${customer.balance.toFixed(2)}`, 60, 280);
      doc.text(`Total Credits: ₹ ${transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`, 60, 297);
      doc.text(`Total Debits: ₹ ${transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`, 280, 280);
      doc.text(`Closing Balance: ₹ ${customer.balance.toFixed(2)}`, 280, 297);

      // Transactions section
      doc.fontSize(10).font('Helvetica-Bold').text('TRANSACTIONS', 50, 345);

      // Table headers
      const tableTop = 365;
      const tableHeaders = ['Date', 'Description', 'Merchant', 'Reference ID', 'Amount', 'Type'];
      const colWidths = [70, 100, 100, 70, 80, 50];
      let currentX = 50;

      doc.rect(50, tableTop - 5, doc.page.width - 100, 20).fill('#1F4788');
      doc.fillColor('#FFFFFF');
      doc.fontSize(8).font('Helvetica-Bold');

      tableHeaders.forEach((header, i) => {
        doc.text(header, currentX, tableTop + 2, { width: colWidths[i], align: 'left' });
        currentX += colWidths[i];
      });

      doc.fillColor('#000000');
      doc.font('Helvetica');

      let tableY = tableTop + 25;
      const pageHeight = doc.page.height;
      const bottomMargin = 100;

      // Add transactions
      transactions.forEach((transaction, index) => {
        if (tableY > pageHeight - bottomMargin) {
          doc.addPage();
          tableY = 50;
        }

        const rowData = [
          moment(transaction.date.toDate()).format('DD/MM/YY'),
          transaction.description.substring(0, 20),
          transaction.merchant.substring(0, 15),
          transaction.transactionId.substring(0, 10),
          `₹ ${transaction.amount.toFixed(2)}`,
          transaction.type === 'credit' ? 'CR' : 'DR'
        ];

        currentX = 50;
        doc.fontSize(7);
        rowData.forEach((data, i) => {
          const color = transaction.type === 'credit' ? '#006400' : '#8B0000';
          doc.fillColor(i === 4 ? color : '#000000');
          doc.text(data, currentX, tableY, { width: colWidths[i], align: 'left' });
          currentX += colWidths[i];
        });

        // Alternating row background
        if (index % 2 === 0) {
          doc.rect(50, tableY - 5, doc.page.width - 100, 12).fill('#F5F5F5');
        }

        tableY += 15;
        doc.fillColor('#000000');
      });

      // Add footer
      doc.fontSize(8).font('Helvetica');
      doc.moveTo(40, doc.page.height - 80).lineTo(doc.page.width - 40, doc.page.height - 80).stroke('#CCCCCC');
      
      doc.text('IMPORTANT NOTICES', 50, doc.page.height - 70);
      doc.fontSize(7);
      doc.text('1. This is a computer-generated statement and does not require signature.', 50, doc.page.height - 55);
      doc.text('2. Please verify all transactions and report discrepancies within 30 days.', 50, doc.page.height - 45);
      doc.text('3. This statement is confidential and intended for the account holder only.', 50, doc.page.height - 35);
      
      // Bank details at bottom
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text(`${bankName} | Registered Office: 123 Banking Street, Mumbai, India`, 50, doc.page.height - 20, { align: 'left' });
      doc.text(`GSTIN: 07AABCT1234K1ZA | CIN: U65999MH2020PTC341234`, 50, doc.page.height - 12, { align: 'left' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePDFStatement
};
