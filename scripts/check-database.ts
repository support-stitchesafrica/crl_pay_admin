import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const firestore = admin.firestore();

async function checkDatabase() {
  console.log('🔍 Checking database collections...\n');

  try {
    // Check loans
    const loansSnapshot = await firestore.collection('crl_loans').limit(5).get();
    console.log(`📊 crl_loans: ${loansSnapshot.size} documents found`);
    if (!loansSnapshot.empty) {
      const loan = loansSnapshot.docs[0].data();
      console.log(`   Sample loan ID: ${loansSnapshot.docs[0].id}`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Principal: ₦${loan.principalAmount?.toLocaleString() || 'N/A'}`);
    }
    console.log('');

    // Check repayment schedules
    const schedulesSnapshot = await firestore.collection('crl_repayment_schedules').limit(5).get();
    console.log(`📅 crl_repayment_schedules: ${schedulesSnapshot.size} documents found`);
    if (!schedulesSnapshot.empty) {
      const schedule = schedulesSnapshot.docs[0].data();
      console.log(`   Sample schedule ID: ${schedulesSnapshot.docs[0].id}`);
      console.log(`   Loan ID: ${schedule.loanId}`);
      console.log(`   Status: ${schedule.status}`);
      console.log(`   Principal: ₦${schedule.principalAmount?.toLocaleString() || 'N/A'}`);
      console.log(`   Has accruedInterest? ${schedule.hasOwnProperty('accruedInterest')}`);
      console.log(`   Has remainingPrincipal? ${schedule.hasOwnProperty('remainingPrincipal')}`);
      console.log(`   Has originalPrincipal? ${schedule.hasOwnProperty('originalPrincipal')}`);
    }
    console.log('');

    // Check customers
    const customersSnapshot = await firestore.collection('crl_customers').limit(5).get();
    console.log(`👥 crl_customers: ${customersSnapshot.size} documents found`);
    console.log('');

    // Check merchants
    const merchantsSnapshot = await firestore.collection('crl_merchants').limit(5).get();
    console.log(`🏪 crl_merchants: ${merchantsSnapshot.size} documents found`);
    console.log('');

    // Get total counts
    const loansCount = (await firestore.collection('crl_loans').count().get()).data().count;
    const schedulesCount = (await firestore.collection('crl_repayment_schedules').count().get()).data().count;
    
    console.log('📈 Total Counts:');
    console.log(`   Total Loans: ${loansCount}`);
    console.log(`   Total Schedules: ${schedulesCount}`);
    console.log('');

    if (loansCount === 0) {
      console.log('⚠️  No loans found in database.');
      console.log('   You need to create a loan first by completing a checkout in the demo store.');
      console.log('   Visit: http://localhost:3006/demo-store.html');
    } else if (schedulesCount === 0) {
      console.log('⚠️  Loans exist but no repayment schedules found.');
      console.log('   This might indicate an issue with loan creation.');
    } else {
      console.log('✅ Database looks good! You can run the backfill script.');
    }

  } catch (error: any) {
    console.error('❌ Error checking database:', error.message);
    throw error;
  }
}

checkDatabase()
  .then(() => {
    console.log('\n✨ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });
