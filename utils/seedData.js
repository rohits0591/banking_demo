const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const MERCHANTS = [
  'Amazon.com',
  'Flipkart',
  'Netflix Subscription',
  'Swiggy Food Delivery',
  'Zomato Restaurant',
  'Uber Rides',
  'Ola Cabs',
  'Apple Store',
  'Google Play Store',
  'BookMyShow',
  'MakeMyTrip Flights',
  'OYO Hotels',
  'Airbnb',
  'Salary Deposit',
  'Insurance Premium',
  'Electricity Bill',
  'Mobile Bill',
  'Internet Bill',
  'Gas Bill',
  'Water Bill',
  'School Fees',
  'Medical Payment',
  'Gym Membership',
  'Cafe Coffee Shop',
  'Petrol Pump',
  'ATM Withdrawal',
  'Transfer to Friend',
  'Stock Investment',
  'Mutual Fund SIP',
  'Cryptocurrency Purchase'
];

const DESCRIPTIONS = {
  debit: [
    'Online Purchase',
    'Subscription',
    'Bill Payment',
    'Fund Transfer',
    'ATM Withdrawal',
    'Service Charges',
    'Utility Payment',
    'Travel Booking',
    'Shopping',
    'Investment'
  ],
  credit: [
    'Salary Credit',
    'Refund',
    'Interest Credit',
    'Bonus',
    'Dividend Payment',
    'Insurance Claim',
    'Transfer Received',
    'Freelance Payment',
    'Cashback',
    'Reimbursement'
  ]
};

const MANDATORY_CUSTOMERS = [
  {
    id: '01009',
    name: 'Rohit Suryavanshi',
    email: 'rohit.suryavanshi@email.com',
    mobile: '+91-9876543210',
    accountNumber: 'SA0010090001',
    ifscCode: 'SCBK0000001',
    balance: 150000.50,
    customerType: 'Premium',
    accountStatus: 'Active',
    joiningDate: moment('2020-03-15').toDate(),
    kycStatus: 'Verified',
    occupation: 'Solutions Architect'
  },
  {
    id: '01058',
    name: 'Vishal Goyal',
    email: 'vishal.goyal@email.com',
    mobile: '+91-8765432109',
    accountNumber: 'SA0010580001',
    ifscCode: 'SCBK0000002',
    balance: 275500.75,
    customerType: 'Ultra-Premium',
    accountStatus: 'Active',
    joiningDate: moment('2019-06-20').toDate(),
    kycStatus: 'Verified',
    occupation: 'Business Owner'
  },
  {
    id: '01021',
    name: 'Reethu AM',
    email: 'reethu.am@email.com',
    mobile: '+91-7654321098',
    accountNumber: 'SA0010210001',
    ifscCode: 'SCBK0000003',
    balance: 89250.25,
    customerType: 'Premium',
    accountStatus: 'Active',
    joiningDate: moment('2021-01-10').toDate(),
    kycStatus: 'Verified',
    occupation: 'Senior Manager'
  },
  {
    id: '01048',
    name: 'Mahesh Kasturi',
    email: 'mahesh.kasturi@email.com',
    mobile: '+91-6543210987',
    accountNumber: 'SA0010480001',
    ifscCode: 'SCBK0000004',
    balance: 225000.00,
    customerType: 'Premium',
    accountStatus: 'Active',
    joiningDate: moment('2020-08-05').toDate(),
    kycStatus: 'Verified',
    occupation: 'Pre-Sales Solutions Architect'
  }
];

const ADDITIONAL_CUSTOMERS = [
  {
    id: '01001',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    mobile: '+91-9123456789',
    accountNumber: 'SA0010010001',
    ifscCode: 'SCBK0000005',
    balance: 45000.00,
    customerType: 'Normal',
    accountStatus: 'Active',
    joiningDate: moment('2022-05-10').toDate(),
    kycStatus: 'Verified',
    occupation: 'Software Developer'
  },
  {
    id: '01002',
    name: 'Amit Patel',
    email: 'amit.patel@email.com',
    mobile: '+91-8987654321',
    accountNumber: 'SA0010020001',
    ifscCode: 'SCBK0000006',
    balance: 125000.50,
    customerType: 'Premium',
    accountStatus: 'Active',
    joiningDate: moment('2021-02-14').toDate(),
    kycStatus: 'Verified',
    occupation: 'Consultant'
  },
  {
    id: '01003',
    name: 'Neha Singh',
    email: 'neha.singh@email.com',
    mobile: '+91-7765432198',
    accountNumber: 'SA0010030001',
    ifscCode: 'SCBK0000007',
    balance: 67850.25,
    customerType: 'Normal',
    accountStatus: 'Active',
    joiningDate: moment('2022-09-22').toDate(),
    kycStatus: 'Verified',
    occupation: 'HR Manager'
  },
  {
    id: '01004',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    mobile: '+91-6543210987',
    accountNumber: 'SA0010040001',
    ifscCode: 'SCBK0000008',
    balance: 320000.00,
    customerType: 'Ultra-Premium',
    accountStatus: 'Active',
    joiningDate: moment('2018-11-30').toDate(),
    kycStatus: 'Verified',
    occupation: 'Finance Director'
  },
  {
    id: '01005',
    name: 'Anjali Verma',
    email: 'anjali.verma@email.com',
    mobile: '+91-5432109876',
    accountNumber: 'SA0010050001',
    ifscCode: 'SCBK0000009',
    balance: 95600.75,
    customerType: 'Premium',
    accountStatus: 'Inactive',
    joiningDate: moment('2019-07-15').toDate(),
    kycStatus: 'Verified',
    occupation: 'Marketing Executive'
  },
  {
    id: '01006',
    name: 'Vikram Singh',
    email: 'vikram.singh@email.com',
    mobile: '+91-4321098765',
    accountNumber: 'SA0010060001',
    ifscCode: 'SCBK0000010',
    balance: 28500.00,
    customerType: 'Normal',
    accountStatus: 'Active',
    joiningDate: moment('2023-01-05').toDate(),
    kycStatus: 'Verified',
    occupation: 'Startup Founder'
  },
  {
    id: '01007',
    name: 'Disha Gupta',
    email: 'disha.gupta@email.com',
    mobile: '+91-3210987654',
    accountNumber: 'SA0010070001',
    ifscCode: 'SCBK0000011',
    balance: 145000.50,
    customerType: 'Premium',
    accountStatus: 'Active',
    joiningDate: moment('2020-04-18').toDate(),
    kycStatus: 'Verified',
    occupation: 'Architect'
  },
  {
    id: '01008',
    name: 'Suresh Menon',
    email: 'suresh.menon@email.com',
    mobile: '+91-2109876543',
    accountNumber: 'SA0010080001',
    ifscCode: 'SCBK0000012',
    balance: 550000.00,
    customerType: 'Ultra-Premium',
    accountStatus: 'Active',
    joiningDate: moment('2017-09-12').toDate(),
    kycStatus: 'Verified',
    occupation: 'Chief Executive Officer'
  },
  {
    id: '01010',
    name: 'Kavya Nair',
    email: 'kavya.nair@email.com',
    mobile: '+91-1098765432',
    accountNumber: 'SA0010100001',
    ifscCode: 'SCBK0000013',
    balance: 78900.00,
    customerType: 'Normal',
    accountStatus: 'Active',
    joiningDate: moment('2022-11-20').toDate(),
    kycStatus: 'Verified',
    occupation: 'Teacher'
  },
  {
    id: '01011',
    name: 'Sameer Ahmed',
    email: 'sameer.ahmed@email.com',
    mobile: '+91-9000111222',
    accountNumber: 'SA0010110001',
    ifscCode: 'SCBK0000014',
    balance: 190000.25,
    customerType: 'Premium',
    accountStatus: 'Active',
    joiningDate: moment('2019-03-08').toDate(),
    kycStatus: 'Verified',
    occupation: 'Project Manager'
  }
];

async function generateTransactions(customerId, customerBalance) {
  const transactions = [];
  let currentBalance = customerBalance;
  
  // Generate transactions for last 6 months
  for (let i = 0; i < 60; i++) {
    const isCredit = Math.random() > 0.6;
    const amount = isCredit 
      ? parseFloat((5000 + Math.random() * 35000).toFixed(2))
      : parseFloat((500 + Math.random() * 15000).toFixed(2));

    const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
    const description = isCredit 
      ? DESCRIPTIONS.credit[Math.floor(Math.random() * DESCRIPTIONS.credit.length)]
      : DESCRIPTIONS.debit[Math.floor(Math.random() * DESCRIPTIONS.debit.length)];

    transactions.push({
      transactionId: uuidv4(),
      date: moment().subtract(i, 'days').toDate(),
      description,
      merchant,
      amount,
      type: isCredit ? 'credit' : 'debit',
      status: 'Completed',
      reference: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
    });
  }

  return transactions;
}

async function seedDatabase(db) {
  try {
    console.log('🌱 Starting database seeding...');

    const allCustomers = [...MANDATORY_CUSTOMERS, ...ADDITIONAL_CUSTOMERS];

    // Add customers to database
    for (const customer of allCustomers) {
      const customerRef = db.collection('customers').doc(customer.id);
      
      // Check if customer already exists
      const docSnapshot = await customerRef.get();
      if (docSnapshot.exists) {
        console.log(`⏭️  Customer ${customer.id} (${customer.name}) already exists. Skipping...`);
        continue;
      }

      // Add customer document
      await customerRef.set({
        ...customer,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ Added customer: ${customer.id} (${customer.name})`);

      // Generate and add transactions
      const transactions = await generateTransactions(customer.id, customer.balance);
      
      const batch = db.batch();
      transactions.forEach(transaction => {
        const txRef = customerRef.collection('transactions').doc();
        batch.set(txRef, transaction);
      });

      await batch.commit();
      console.log(`📊 Added ${transactions.length} transactions for ${customer.name}`);
    }

    console.log('✨ Database seeding completed successfully!');
    return { success: true, customersAdded: allCustomers.length };
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

module.exports = {
  seedDatabase,
  MANDATORY_CUSTOMERS,
  ADDITIONAL_CUSTOMERS
};
