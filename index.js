const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { generatePDFStatement } = require('./utils/pdfGenerator');
const { seedDatabase } = require('./utils/seedData');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Firebase Admin Initialize (No Storage Bucket)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Bank API is running' });
});

// Initialize Database (Run once)
app.post('/api/init', async (req, res) => {
  try {
    await seedDatabase(db);
    res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch all customers (with pagination)
app.get('/api/customers', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const snapshot = await db.collection('customers')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch single customer by ID
app.get('/api/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const doc = await db.collection('customers').doc(customerId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch customer transactions
app.get('/api/customers/:customerId/transactions', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify customer exists
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const snapshot = await db.collection('customers')
      .doc(customerId)
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const moment = require('moment');

    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firebase timestamp to proper date/time
      let transactionDate;
      if (data.date && data.date._seconds !== undefined) {
        // Firestore Timestamp with _seconds and _nanoseconds
        transactionDate = new Date(data.date._seconds * 1000);
      } else if (data.date && typeof data.date.toDate === 'function') {
        // Firebase Timestamp object with toDate() method
        transactionDate = data.date.toDate();
      } else if (data.date instanceof Date) {
        // Already a Date object
        transactionDate = data.date;
      } else {
        // Fallback
        transactionDate = new Date(data.date);
      }

      return {
        id: doc.id,
        transactionId: data.transactionId,
        type: data.type,
        amount: data.amount,
        date: transactionDate.toISOString(),
        dateFormatted: moment(transactionDate).format('DD/MM/YYYY'),
        timeFormatted: moment(transactionDate).format('HH:mm:ss'),
        status: data.status,
        description: data.description,
        merchant: data.merchant,
        reference: data.reference,
        category: data.category || 'general'
      };
    });

    res.status(200).json({
      success: true,
      customerId,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch single transaction details
app.get('/api/customers/:customerId/transactions/:transactionId', async (req, res) => {
  try {
    const { customerId, transactionId } = req.params;

    // Verify customer exists
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Fetch single transaction
    const transactionDoc = await db.collection('customers')
      .doc(customerId)
      .collection('transactions')
      .doc(transactionId)
      .get();

    if (!transactionDoc.exists) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transactionData = transactionDoc.data();
    const moment = require('moment');
    
    // Convert Firebase timestamp to proper date/time
    let transactionDate;
    if (transactionData.date && transactionData.date._seconds !== undefined) {
      // Firestore Timestamp with _seconds and _nanoseconds
      transactionDate = new Date(transactionData.date._seconds * 1000);
    } else if (transactionData.date && typeof transactionData.date.toDate === 'function') {
      // Firebase Timestamp object with toDate() method
      transactionDate = transactionData.date.toDate();
    } else if (transactionData.date instanceof Date) {
      // Already a Date object
      transactionDate = transactionData.date;
    } else {
      // Fallback
      transactionDate = new Date(transactionData.date);
    }

    // Format dates properly
    const dateFormatted = moment(transactionDate).format('DD/MM/YYYY');
    const timeFormatted = moment(transactionDate).format('HH:mm:ss');

    res.status(200).json({
      success: true,
      customerId,
      data: {
        id: transactionId,
        transactionId: transactionData.transactionId,
        type: transactionData.type,
        amount: transactionData.amount,
        date: transactionDate.toISOString(),
        dateFormatted: dateFormatted,
        timeFormatted: timeFormatted,
        status: transactionData.status,
        description: transactionData.description,
        merchant: transactionData.merchant,
        reference: transactionData.reference,
        category: transactionData.category || 'general',
        balance: transactionData.balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch latest 3 transactions for a customer ⭐ UPDATED
app.get('/api/customers/:customerId/transactions/latest', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Verify customer exists
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Fetch latest 3 transactions (ordered by date descending, limit 3)
    const snapshot = await db.collection('customers')
      .doc(customerId)
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(3)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'No transactions found' });
    }

    const moment = require('moment');
    
    const transactions = snapshot.docs.map(transactionDoc => {
      const data = transactionDoc.data();

      // Convert Firebase timestamp to proper date/time
      let transactionDate;
      if (data.date && data.date._seconds !== undefined) {
        // Firestore Timestamp with _seconds and _nanoseconds
        transactionDate = new Date(data.date._seconds * 1000);
      } else if (data.date && typeof data.date.toDate === 'function') {
        // Firebase Timestamp object with toDate() method
        transactionDate = data.date.toDate();
      } else if (data.date instanceof Date) {
        // Already a Date object
        transactionDate = data.date;
      } else {
        // Fallback
        transactionDate = new Date(data.date);
      }

      // Format dates properly
      const dateFormatted = moment(transactionDate).format('DD/MM/YYYY');
      const timeFormatted = moment(transactionDate).format('HH:mm:ss');

      return {
        id: transactionDoc.id,
        transactionId: data.transactionId,
        type: data.type,
        amount: data.amount,
        date: transactionDate.toISOString(),
        dateFormatted: dateFormatted,
        timeFormatted: timeFormatted,
        status: data.status,
        description: data.description,
        merchant: data.merchant,
        reference: data.reference,
        category: data.category || 'general',
        balance: data.balance
      };
    });

    res.status(200).json({
      success: true,
      customerId,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching latest transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update customer email ⭐ NEW
app.put('/api/customers/:customerId/email', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { email } = req.body;

    // Validate email is provided
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Verify customer exists
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerData = customerDoc.data();
    const oldEmail = customerData.email;

    // Update customer email
    await db.collection('customers').doc(customerId).update({
      email: email,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      customerId,
      data: {
        customerId,
        name: customerData.name,
        oldEmail: oldEmail,
        newEmail: email,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating customer email:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Generate and download statement (Returns PDF directly)
app.post('/api/customers/:customerId/statement', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { period = 'month', fromDate, toDate } = req.body;

    // Verify customer exists
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerData = customerDoc.data();

    // Calculate date range
    const moment = require('moment');
    let from, to;

    if (fromDate && toDate) {
      from = moment(fromDate);
      to = moment(toDate);
    } else {
      to = moment();
      switch (period) {
        case '15days':
          from = to.clone().subtract(15, 'days');
          break;
        case '3months':
          from = to.clone().subtract(3, 'months');
          break;
        case '6months':
          from = to.clone().subtract(6, 'months');
          break;
        case 'year':
          from = to.clone().subtract(1, 'year');
          break;
        case 'month':
        default:
          from = to.clone().subtract(1, 'month');
          break;
      }
    }

    // Fetch transactions in date range
    const snapshot = await db.collection('customers')
      .doc(customerId)
      .collection('transactions')
      .where('date', '>=', from.toDate())
      .where('date', '<=', to.toDate())
      .orderBy('date', 'desc')
      .get();

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Generate PDF in memory
    const filename = `statement_${customerId}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const pdfBuffer = await generatePDFStatement({
      customer: customerData,
      customerId,
      transactions,
      fromDate: from,
      toDate: to
    });

    // Save record to statement history (metadata only, no URL)
    await db.collection('customers')
      .doc(customerId)
      .collection('statement_history')
      .add({
        filename,
        period,
        fromDate: from.toDate(),
        toDate: to.toDate(),
        transactionCount: transactions.length,
        generatedAt: admin.firestore.Timestamp.now()
      });

    // Return PDF directly as downloadable file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Statement generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Generate temporary download link for statement
app.get('/api/customers/:customerId/statement-link', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { period = 'month', fromDate, toDate } = req.query;

    // Verify customer exists
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Create filename format: statement_CUSTOMERID_TIMESTAMP.pdf
    const moment = require('moment');
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `statement_${customerId}_${timestamp}.pdf`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store link metadata in temporary collection (filename as doc ID)
    await db.collection('statement_links').doc(filename).set({
      customerId: customerId,
      filename: filename,
      period: period || 'month',
      fromDate: fromDate || null,
      toDate: toDate || null,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: expiresAt,
      downloads: 0
    });

    // Generate download link with filename
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const downloadLink = `${baseUrl}/api/statement/download/${filename}`;

    res.status(200).json({
      success: true,
      data: {
        customerId: customerId,
        filename: filename,
        downloadLink: downloadLink,
        period: period || 'month',
        expiresAt: expiresAt.toISOString(),
        expiresIn: '24 hours',
        instructions: 'Share this link or click to download PDF. Link expires in 24 hours.'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Download statement using filename (e.g., statement_01009_20240110_143022.pdf)
app.get('/api/statement/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Verify filename format and extract customer ID
    const filenameRegex = /^statement_(\d+)_(\d{8}_\d{6})\.pdf$/;
    const match = filename.match(filenameRegex);
    
    if (!match) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }

    const customerId = match[1];

    // Verify link exists and is not expired
    const linkDoc = await db.collection('statement_links').doc(filename).get();
    if (!linkDoc.exists) {
      return res.status(404).json({ error: 'Download link not found or expired' });
    }

    const linkData = linkDoc.data();
    const now = new Date();
    const expiresAt = new Date(linkData.expiresAt);

    if (now > expiresAt) {
      // Delete expired link
      await db.collection('statement_links').doc(filename).delete();
      return res.status(410).json({ error: 'Download link has expired' });
    }

    // Verify customer ID matches
    if (linkData.customerId !== customerId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const { period, fromDate, toDate } = linkData;

    // Get customer
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerData = customerDoc.data();

    // Calculate date range
    const moment = require('moment');
    let from, to;

    if (fromDate && toDate) {
      from = moment(fromDate);
      to = moment(toDate);
    } else {
      to = moment();
      switch (period) {
        case '15days':
          from = to.clone().subtract(15, 'days');
          break;
        case '3months':
          from = to.clone().subtract(3, 'months');
          break;
        case '6months':
          from = to.clone().subtract(6, 'months');
          break;
        case 'year':
          from = to.clone().subtract(1, 'year');
          break;
        case 'month':
        default:
          from = to.clone().subtract(1, 'month');
          break;
      }
    }

    // Fetch transactions in date range
    const snapshot = await db.collection('customers')
      .doc(customerId)
      .collection('transactions')
      .where('date', '>=', from.toDate())
      .where('date', '<=', to.toDate())
      .orderBy('date', 'desc')
      .get();

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Generate PDF in memory
    const pdfBuffer = await generatePDFStatement({
      customer: customerData,
      customerId,
      transactions,
      fromDate: from,
      toDate: to
    });

    // Increment download counter
    await db.collection('statement_links').doc(filename).update({
      downloads: linkData.downloads + 1,
      lastDownloadAt: admin.firestore.Timestamp.now()
    });

    // Save record to statement history
    await db.collection('customers')
      .doc(customerId)
      .collection('statement_history')
      .add({
        filename,
        period,
        fromDate: from.toDate(),
        toDate: to.toDate(),
        transactionCount: transactions.length,
        downloadedAt: admin.firestore.Timestamp.now(),
        downloadedVia: 'temporary_link'
      });

    // Return PDF directly with filename
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Statement download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch statement history
app.get('/api/customers/:customerId/statement-history', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 20 } = req.query;

    const snapshot = await db.collection('customers')
      .doc(customerId)
      .collection('statement_history')
      .orderBy('downloadedAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const statements = snapshot.docs.map(doc => ({
      id: doc.id,
      filename: doc.data().filename,
      period: doc.data().period,
      fromDate: doc.data().fromDate?.toDate(),
      toDate: doc.data().toDate?.toDate(),
      transactionCount: doc.data().transactionCount,
      downloadedAt: doc.data().downloadedAt?.toDate() || doc.data().generatedAt?.toDate(),
      downloadedVia: doc.data().downloadedVia || 'direct'
    }));

    res.status(200).json({
      success: true,
      customerId,
      count: statements.length,
      data: statements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Search customers by name or email
app.get('/api/search/customers', async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    let snapshot;
    if (type === 'email') {
      snapshot = await db.collection('customers')
        .where('email', '==', query)
        .get();
    } else {
      // For name search, we'll fetch all and filter (Firebase limitation)
      snapshot = await db.collection('customers')
        .where('name', '>=', query)
        .where('name', '<=', query + '\uf8ff')
        .get();
    }

    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Account summary
app.get('/api/customers/:customerId/summary', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerDoc.data();

    // Get last 10 transactions
    const transactionsSnapshot = await db.collection('customers')
      .doc(customerId)
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(10)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const allTransactionsSnapshot = await db.collection('customers')
      .doc(customerId)
      .collection('transactions')
      .get();

    const allTransactions = allTransactionsSnapshot.docs.map(doc => doc.data());
    const totalDebits = allTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = allTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    // Format last transaction date
    let lastTransactionDate = null;
    if (transactions[0]) {
      if (transactions[0].date && transactions[0].date._seconds !== undefined) {
        lastTransactionDate = new Date(transactions[0].date._seconds * 1000);
      } else if (transactions[0].date && typeof transactions[0].date.toDate === 'function') {
        lastTransactionDate = transactions[0].date.toDate();
      } else if (transactions[0].date instanceof Date) {
        lastTransactionDate = transactions[0].date;
      } else {
        lastTransactionDate = new Date(transactions[0].date);
      }
    }

    const moment = require('moment');

    res.status(200).json({
      success: true,
      data: {
        customerId,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        accountStatus: customer.accountStatus,
        customerType: customer.customerType,
        currentBalance: customer.balance,
        lastTransactionDate: lastTransactionDate ? lastTransactionDate.toISOString() : null,
        lastTransactionDateFormatted: lastTransactionDate ? moment(lastTransactionDate).format('DD/MM/YYYY') : null,
        lastTransactionTimeFormatted: lastTransactionDate ? moment(lastTransactionDate).format('HH:mm:ss') : null,
        recentTransactions: transactions,
        statistics: {
          totalTransactions: allTransactions.length,
          totalDebits: totalDebits.toFixed(2),
          totalCredits: totalCredits.toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bank API running on port ${PORT}`);
});

module.exports = app;
