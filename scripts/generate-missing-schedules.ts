import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

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

function calculateNumberOfInstallments(frequency: string, tenor: any): number {
  const value = tenor.value;
  const period = tenor.period.toUpperCase();

  switch (frequency) {
    case 'daily':
      if (period === 'DAYS') return value;
      if (period === 'WEEKS') return value * 7;
      if (period === 'MONTHS') return value * 30;
      return value;
    case 'weekly':
      if (period === 'WEEKS') return value;
      if (period === 'MONTHS') return value * 4;
      return Math.ceil(value / 7);
    case 'monthly':
      if (period === 'MONTHS') return value;
      if (period === 'WEEKS') return Math.ceil(value / 4);
      return Math.ceil(value / 30);
    default:
      return value;
  }
}

function calculateDueDate(startDate: Date, frequency: string, installmentIndex: number): Date {
  const dueDate = new Date(startDate);

  switch (frequency) {
    case 'daily':
      dueDate.setDate(dueDate.getDate() + installmentIndex + 1);
      break;
    case 'weekly':
      dueDate.setDate(dueDate.getDate() + (installmentIndex + 1) * 7);
      break;
    case 'monthly':
      dueDate.setMonth(dueDate.getMonth() + installmentIndex + 1);
      break;
    default:
      dueDate.setMonth(dueDate.getMonth() + installmentIndex + 1);
  }

  return dueDate;
}

async function generateMissingSchedules() {
  console.log('🔧 Generating missing repayment schedules...\n');

  try {
    // Get all loans
    const loansSnapshot = await firestore.collection('crl_loans').get();

    if (loansSnapshot.empty) {
      console.log('No loans found.');
      return;
    }

    console.log(`Found ${loansSnapshot.size} loans to check.\n`);

    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const loanDoc of loansSnapshot.docs) {
      const loan = loanDoc.data();
      const loanId = loanDoc.id;

      try {
        // Check if schedules already exist for this loan
        const existingSchedules = await firestore
          .collection('crl_repayment_schedules')
          .where('loanId', '==', loanId)
          .limit(1)
          .get();

        if (!existingSchedules.empty) {
          console.log(`⏭️  Skipping ${loan.loanAccountNumber} - schedules already exist`);
          skippedCount++;
          continue;
        }

        console.log(`\n📝 Generating schedules for ${loan.loanAccountNumber}`);
        console.log(`   Loan ID: ${loanId}`);
        console.log(`   Principal: ₦${loan.principalAmount?.toLocaleString()}`);
        console.log(`   Status: ${loan.status}`);

        // Calculate schedule parameters
        const numberOfInstallments = calculateNumberOfInstallments(
          loan.configuration.frequency,
          loan.configuration.tenor
        );

        const installmentAmount = Math.ceil(loan.configuration.totalAmount / numberOfInstallments);
        const principalPerInstallment = Math.ceil(loan.principalAmount / numberOfInstallments);
        const interestPerInstallment = Math.ceil(
          (loan.configuration.totalAmount - loan.principalAmount) / numberOfInstallments
        );

        // Handle Firestore Timestamp conversion
        let startDate: Date;
        if (loan.firstPaymentDate) {
          startDate = loan.firstPaymentDate.toDate ? loan.firstPaymentDate.toDate() : new Date(loan.firstPaymentDate);
        } else if (loan.createdAt) {
          startDate = loan.createdAt.toDate ? loan.createdAt.toDate() : new Date(loan.createdAt);
        } else {
          startDate = new Date();
        }

        console.log(`   Installments: ${numberOfInstallments}`);
        console.log(`   Frequency: ${loan.configuration.frequency}`);
        console.log(`   Per Installment: ₦${installmentAmount.toLocaleString()}`);

        // Generate schedules
        const batch = firestore.batch();
        let schedulesCreated = 0;

        for (let i = 0; i < numberOfInstallments; i++) {
          const scheduleId = uuidv4();
          const dueDate = calculateDueDate(startDate, loan.configuration.frequency, i);

          const schedule = {
            scheduleId,
            loanId,
            merchantId: loan.merchantId,
            customerId: loan.customerId,
            financierId: loan.metadata?.financierId || '',
            installmentNumber: i + 1,
            dueDate: admin.firestore.Timestamp.fromDate(dueDate),
            amount: installmentAmount,
            principalAmount: principalPerInstallment,
            interestAmount: interestPerInstallment,
            status: 'pending',
            paidAmount: 0,
            lateFee: 0,
            totalDue: installmentAmount,
            retryCount: 0,
            // New accrual fields
            accruedInterest: 0,
            remainingPrincipal: principalPerInstallment,
            originalPrincipal: principalPerInstallment,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          const scheduleRef = firestore.collection('crl_repayment_schedules').doc(scheduleId);
          batch.set(scheduleRef, schedule);
          schedulesCreated++;
        }

        // Commit batch
        await batch.commit();

        console.log(`   ✅ Created ${schedulesCreated} schedules`);
        generatedCount++;

      } catch (error: any) {
        console.error(`   ❌ Error processing loan ${loanId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n=== Generation Summary ===');
    console.log(`Total loans checked: ${loansSnapshot.size}`);
    console.log(`✅ Schedules generated for: ${generatedCount} loans`);
    console.log(`⏭️  Skipped (already had schedules): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n✨ Schedule generation completed!');

    // Verify
    const totalSchedules = (await firestore.collection('crl_repayment_schedules').count().get()).data().count;
    console.log(`\n📊 Total schedules in database: ${totalSchedules}`);

  } catch (error: any) {
    console.error('Fatal error:', error);
    throw error;
  }
}

generateMissingSchedules()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
