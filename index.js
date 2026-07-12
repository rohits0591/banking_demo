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

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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

// GET: Fetch statement history (metadata only)
app.get('/api/customers/:customerId/statement-history', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 20 } = req.query;

    const snapshot = await db.collection('customers')
      .doc(customerId)
      .collection('statement_history')
      .orderBy('generatedAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const statements = snapshot.docs.map(doc => ({
      id: doc.id,
      filename: doc.data().filename,
      period: doc.data().period,
      fromDate: doc.data().fromDate?.toDate(),
      toDate: doc.data().toDate?.toDate(),
      transactionCount: doc.data().transactionCount,
      generatedAt: doc.data().generatedAt?.toDate(),
      downloadEndpoint: `/api/customers/${customerId}/statement-history/${doc.id}/download`
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
        lastTransactionDate: transactions[0]?.date?.toDate(),
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
