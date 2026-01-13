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

interface Loan {
  loanId: string;
  status: string;
  currentInstallment: number;
  createdAt: admin.firestore.Timestamp;
  activatedAt?: admin.firestore.Timestamp;
  configuration?: {
    interestRate: number;
  };
}

interface RepaymentScheduleItem {
  scheduleId: string;
  loanId: string;
  installmentNumber: number;
  status: string;
  interestAmount: number;
  principalAmount: number;
  remainingPrincipal?: number;
  accruedInterest?: number;
  lastAccrualDate?: admin.firestore.Timestamp;
}

async function fixAccruedInterest() {
  console.log('🔧 Starting accrued interest correction...\n');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active loans
    const loansSnapshot = await firestore
      .collection('crl_loans')
      .where('status', '==', 'active')
      .get();

    console.log(`Found ${loansSnapshot.size} active loans\n`);

    let totalSchedulesFixed = 0;
    let totalInterestCorrected = 0;

    for (const loanDoc of loansSnapshot.docs) {
      const loan = loanDoc.data() as Loan;
      const currentInstallment = loan.currentInstallment || 1;

      console.log(`\n📋 Processing Loan: ${loan.loanId}`);
      console.log(`   Current Installment: ${currentInstallment}`);

      // Get ONLY the current active installment
      const schedulesSnapshot = await firestore
        .collection('crl_repayment_schedules')
        .where('loanId', '==', loan.loanId)
        .where('installmentNumber', '==', currentInstallment)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (schedulesSnapshot.empty) {
        console.log(`   ⚠️  No active pending schedule found`);
        continue;
      }

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const schedule = scheduleDoc.data() as RepaymentScheduleItem;

        console.log(`   Schedule ID: ${schedule.scheduleId}`);
        console.log(`   Monthly Interest: ₦${schedule.interestAmount.toLocaleString()}`);
        console.log(`   Old Accrued Interest: ₦${(schedule.accruedInterest || 0).toLocaleString()}`);

        // Determine start date (loan activation or creation)
        const startDate = loan.activatedAt
          ? loan.activatedAt.toDate()
          : loan.createdAt.toDate();
        startDate.setHours(0, 0, 0, 0);

        // Calculate days since activation
        const daysSinceActivation = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log(`   Days Since Activation: ${daysSinceActivation}`);

        if (daysSinceActivation <= 0) {
          console.log(`   ⚠️  Loan not yet active, skipping`);
          continue;
        }

        // Calculate correct accrued interest
        // Daily interest = Monthly interest / 30 days
        const monthlyInterest = schedule.interestAmount;
        const daysInMonth = 30;
        const dailyInterest = Math.ceil(monthlyInterest / daysInMonth);
        const correctAccruedInterest = dailyInterest * daysSinceActivation;

        console.log(`   Daily Interest: ₦${dailyInterest.toLocaleString()}`);
        console.log(`   Correct Accrued Interest: ₦${correctAccruedInterest.toLocaleString()}`);

        // Update the schedule with correct values
        await firestore
          .collection('crl_repayment_schedules')
          .doc(schedule.scheduleId)
          .update({
            accruedInterest: correctAccruedInterest,
            lastAccrualDate: admin.firestore.Timestamp.fromDate(today),
            updatedAt: admin.firestore.Timestamp.now(),
          });

        totalSchedulesFixed++;
        totalInterestCorrected += correctAccruedInterest - (schedule.accruedInterest || 0);

        console.log(`   ✅ Updated successfully`);
      }

      // Reset accrued interest on future installments (should be 0)
      const futureSchedulesSnapshot = await firestore
        .collection('crl_repayment_schedules')
        .where('loanId', '==', loan.loanId)
        .where('installmentNumber', '>', currentInstallment)
        .where('status', '==', 'pending')
        .get();

      for (const futureScheduleDoc of futureSchedulesSnapshot.docs) {
        const futureSchedule = futureScheduleDoc.data() as RepaymentScheduleItem;
        
        if (futureSchedule.accruedInterest && futureSchedule.accruedInterest > 0) {
          console.log(`   🔄 Resetting future installment #${futureSchedule.installmentNumber} (had ₦${futureSchedule.accruedInterest})`);
          
          await firestore
            .collection('crl_repayment_schedules')
            .doc(futureSchedule.scheduleId)
            .update({
              accruedInterest: 0,
              lastAccrualDate: admin.firestore.FieldValue.delete(),
              updatedAt: admin.firestore.Timestamp.now(),
            });
        }
      }
    }

    console.log('\n\n✅ Accrued interest correction completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Schedules fixed: ${totalSchedulesFixed}`);
    console.log(`   - Net interest correction: ₦${totalInterestCorrected.toLocaleString()}`);
    console.log('\n✨ Script completed successfully\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing accrued interest:', error);
    process.exit(1);
  }
}

fixAccruedInterest();
