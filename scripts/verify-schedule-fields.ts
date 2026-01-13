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

async function verifyScheduleFields() {
  console.log('🔍 Verifying repayment schedule fields...\n');

  try {
    // Get a sample schedule
    const schedulesSnapshot = await firestore
      .collection('crl_repayment_schedules')
      .limit(5)
      .get();

    if (schedulesSnapshot.empty) {
      console.log('❌ No repayment schedules found in database');
      return;
    }

    console.log(`Found ${schedulesSnapshot.size} schedules to check\n`);

    schedulesSnapshot.docs.forEach((doc, index) => {
      const schedule = doc.data();
      console.log(`\n📋 Schedule ${index + 1} (${doc.id}):`);
      console.log(`   Installment #: ${schedule.installmentNumber}`);
      console.log(`   Loan ID: ${schedule.loanId}`);
      console.log(`   Status: ${schedule.status}`);
      console.log(`   Principal Amount: ₦${schedule.principalAmount?.toLocaleString() || 'N/A'}`);
      console.log(`   Interest Amount: ₦${schedule.interestAmount?.toLocaleString() || 'N/A'}`);
      
      // Check for accrual tracking fields
      console.log('\n   🔍 Accrual Tracking Fields:');
      console.log(`   ✓ accruedInterest: ${schedule.accruedInterest !== undefined ? '₦' + (schedule.accruedInterest || 0).toLocaleString() : '❌ MISSING'}`);
      console.log(`   ✓ remainingPrincipal: ${schedule.remainingPrincipal !== undefined ? '₦' + (schedule.remainingPrincipal || 0).toLocaleString() : '❌ MISSING'}`);
      console.log(`   ✓ originalPrincipal: ${schedule.originalPrincipal !== undefined ? '₦' + (schedule.originalPrincipal || 0).toLocaleString() : '❌ MISSING'}`);
      console.log(`   ✓ lastAccrualDate: ${schedule.lastAccrualDate !== undefined ? (schedule.lastAccrualDate || 'null') : '❌ MISSING'}`);
      console.log(`   ✓ lateFee: ${schedule.lateFee !== undefined ? '₦' + (schedule.lateFee || 0).toLocaleString() : '❌ MISSING'}`);
      
      // List all fields present
      console.log('\n   📝 All Fields Present:');
      console.log(`   ${Object.keys(schedule).join(', ')}`);
    });

    // Check a loan to see if it has the fields
    console.log('\n\n🔍 Checking loan data...\n');
    const loansSnapshot = await firestore
      .collection('crl_loans')
      .limit(1)
      .get();

    if (!loansSnapshot.empty) {
      const loan = loansSnapshot.docs[0].data();
      console.log(`📊 Loan: ${loansSnapshot.docs[0].id}`);
      console.log(`   Loan Account Number: ${loan.loanAccountNumber || '❌ MISSING'}`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Payment Schedule Items: ${loan.paymentSchedule?.length || 0}`);
      
      if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
        const firstSchedule = loan.paymentSchedule[0];
        console.log('\n   First Schedule Item Fields:');
        console.log(`   ✓ accruedInterest: ${firstSchedule.accruedInterest !== undefined ? 'Present' : '❌ MISSING'}`);
        console.log(`   ✓ remainingPrincipal: ${firstSchedule.remainingPrincipal !== undefined ? 'Present' : '❌ MISSING'}`);
        console.log(`   ✓ originalPrincipal: ${firstSchedule.originalPrincipal !== undefined ? 'Present' : '❌ MISSING'}`);
        console.log(`   ✓ lateFee: ${firstSchedule.lateFee !== undefined ? 'Present' : '❌ MISSING'}`);
      }
    }

    console.log('\n\n✅ Verification complete!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

verifyScheduleFields()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
