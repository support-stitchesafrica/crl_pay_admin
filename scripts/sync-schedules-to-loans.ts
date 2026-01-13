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

async function syncSchedulesToLoans() {
  console.log('🔄 Syncing repayment schedules to loan documents...\n');

  try {
    // Get all loans
    const loansSnapshot = await firestore.collection('crl_loans').get();

    if (loansSnapshot.empty) {
      console.log('No loans found.');
      return;
    }

    console.log(`Found ${loansSnapshot.size} loans to sync.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const loanDoc of loansSnapshot.docs) {
      const loan = loanDoc.data();
      const loanId = loanDoc.id;

      try {
        // Get all schedules for this loan from crl_repayment_schedules
        const schedulesSnapshot = await firestore
          .collection('crl_repayment_schedules')
          .where('loanId', '==', loanId)
          .get();

        if (schedulesSnapshot.empty) {
          console.log(`⚠️  No schedules found for loan ${loan.loanAccountNumber || loanId}`);
          continue;
        }

        // Sort schedules by installment number in memory
        const sortedDocs = schedulesSnapshot.docs.sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          return (aData.installmentNumber || 0) - (bData.installmentNumber || 0);
        });

        // Map schedules to payment schedule format
        const paymentSchedule = sortedDocs.map(doc => {
          const schedule = doc.data();
          return {
            scheduleId: schedule.scheduleId,
            installmentNumber: schedule.installmentNumber,
            dueDate: schedule.dueDate,
            amount: schedule.amount,
            principalAmount: schedule.principalAmount,
            interestAmount: schedule.interestAmount,
            status: schedule.status,
            paidAmount: schedule.paidAmount || 0,
            paidAt: schedule.paidAt || null,
            paymentId: schedule.paymentId || null,
            attemptCount: schedule.attemptCount || 0,
            lastAttemptAt: schedule.lastAttemptAt || null,
            // Accrual tracking fields
            accruedInterest: schedule.accruedInterest || 0,
            remainingPrincipal: schedule.remainingPrincipal || schedule.principalAmount,
            originalPrincipal: schedule.originalPrincipal || schedule.principalAmount,
            lastAccrualDate: schedule.lastAccrualDate || null,
            lateFee: schedule.lateFee || 0,
            totalDue: schedule.totalDue || schedule.amount,
            retryCount: schedule.retryCount || 0,
          };
        });

        // Update loan document with synced payment schedule
        await firestore.collection('crl_loans').doc(loanId).update({
          paymentSchedule,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Synced ${paymentSchedule.length} schedules for loan ${loan.loanAccountNumber || loanId}`);
        successCount++;

      } catch (error: any) {
        console.error(`❌ Error syncing loan ${loanId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n=== Sync Summary ===');
    console.log(`Total loans: ${loansSnapshot.size}`);
    console.log(`✅ Successfully synced: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n✨ Sync completed!');

  } catch (error: any) {
    console.error('Fatal error:', error);
    throw error;
  }
}

syncSchedulesToLoans()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
