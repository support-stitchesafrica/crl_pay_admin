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

async function backfillScheduleInterestAmounts() {
  console.log('🔧 Backfilling payment schedule interest amounts...\n');

  try {
    // Get the loan that was just updated
    const loansSnapshot = await firestore
      .collection('crl_loans')
      .where('loanAccountNumber', '==', 'LOAN-1767618050370-YL2JF')
      .get();

    if (loansSnapshot.empty) {
      console.log('❌ Loan not found');
      return;
    }

    const loanDoc = loansSnapshot.docs[0];
    const loan = loanDoc.data();
    const loanId = loanDoc.id;

    console.log(`Processing loan: ${loan.loanAccountNumber}`);
    console.log(`Interest Rate: ${loan.configuration.interestRate}%`);
    console.log(`Total Interest: ₦${loan.configuration.totalInterest}`);
    console.log(`Number of Installments: ${loan.configuration.numberOfInstallments}\n`);

    // Calculate interest per installment
    const interestPerInstallment = Math.ceil(loan.configuration.totalInterest / loan.configuration.numberOfInstallments);
    const principalPerInstallment = Math.ceil(loan.principalAmount / loan.configuration.numberOfInstallments);
    const installmentAmount = principalPerInstallment + interestPerInstallment;

    console.log(`Interest per installment: ₦${interestPerInstallment}`);
    console.log(`Principal per installment: ₦${principalPerInstallment}`);
    console.log(`Total per installment: ₦${installmentAmount}\n`);

    // Update schedules in crl_repayment_schedules collection
    const schedulesSnapshot = await firestore
      .collection('crl_repayment_schedules')
      .where('loanId', '==', loanId)
      .get();

    console.log(`Found ${schedulesSnapshot.size} schedules to update\n`);

    let successCount = 0;

    for (const scheduleDoc of schedulesSnapshot.docs) {
      const schedule = scheduleDoc.data();

      await firestore.collection('crl_repayment_schedules').doc(scheduleDoc.id).update({
        interestAmount: interestPerInstallment,
        principalAmount: principalPerInstallment,
        amount: installmentAmount,
        totalDue: installmentAmount,
        remainingPrincipal: principalPerInstallment,
        originalPrincipal: principalPerInstallment,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Updated schedule #${schedule.installmentNumber}`);
      successCount++;
    }

    // Update payment schedule in loan document
    const updatedSchedules = schedulesSnapshot.docs
      .sort((a, b) => a.data().installmentNumber - b.data().installmentNumber)
      .map(doc => {
        const schedule = doc.data();
        return {
          scheduleId: schedule.scheduleId,
          installmentNumber: schedule.installmentNumber,
          dueDate: schedule.dueDate,
          amount: installmentAmount,
          principalAmount: principalPerInstallment,
          interestAmount: interestPerInstallment,
          status: schedule.status,
          paidAmount: schedule.paidAmount || 0,
          paidAt: schedule.paidAt || null,
          paymentId: schedule.paymentId || null,
          attemptCount: schedule.attemptCount || 0,
          lastAttemptAt: schedule.lastAttemptAt || null,
          accruedInterest: schedule.accruedInterest || 0,
          remainingPrincipal: principalPerInstallment,
          originalPrincipal: principalPerInstallment,
          lastAccrualDate: schedule.lastAccrualDate || null,
          lateFee: schedule.lateFee || 0,
          totalDue: installmentAmount,
          retryCount: schedule.retryCount || 0,
        };
      });

    await firestore.collection('crl_loans').doc(loanId).update({
      paymentSchedule: updatedSchedules,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n✅ Updated loan document with corrected payment schedule`);

    console.log('\n=== Summary ===');
    console.log(`✅ Successfully updated ${successCount} schedules`);
    console.log('✨ Backfill completed!');

  } catch (error: any) {
    console.error('Fatal error:', error);
    throw error;
  }
}

backfillScheduleInterestAmounts()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
