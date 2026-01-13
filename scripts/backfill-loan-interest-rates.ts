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

async function backfillLoanInterestRates() {
  console.log('🔧 Backfilling loan interest rates from financing plans...\n');

  try {
    // Get all loans with 0% interest rate
    const loansSnapshot = await firestore
      .collection('crl_loans')
      .where('configuration.interestRate', '==', 0)
      .get();

    if (loansSnapshot.empty) {
      console.log('✅ No loans found with 0% interest rate');
      return;
    }

    console.log(`Found ${loansSnapshot.size} loans with 0% interest rate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const loanDoc of loansSnapshot.docs) {
      const loan = loanDoc.data();
      const loanId = loanDoc.id;

      try {
        // Get the financing plan ID from loan metadata
        const planId = loan.metadata?.planId;

        if (!planId) {
          console.log(`⚠️  Loan ${loan.loanAccountNumber || loanId} has no planId in metadata, skipping`);
          errorCount++;
          continue;
        }

        // Fetch the financing plan
        const planDoc = await firestore
          .collection('crl_financing_plans')
          .doc(planId)
          .get();

        if (!planDoc.exists) {
          console.log(`⚠️  Financing plan ${planId} not found for loan ${loan.loanAccountNumber || loanId}`);
          errorCount++;
          continue;
        }

        const plan = planDoc.data();
        const interestRate = plan?.interestRate || 0;
        const penaltyRate = plan?.penaltyRate || 5;

        if (interestRate === 0) {
          console.log(`⚠️  Financing plan ${planId} also has 0% interest rate, skipping loan ${loan.loanAccountNumber || loanId}`);
          errorCount++;
          continue;
        }

        // Recalculate loan configuration with correct interest rate
        const principalAmount = loan.principalAmount;
        const numberOfInstallments = loan.configuration.numberOfInstallments;
        const tenor = loan.configuration.tenor;

        // Calculate total interest based on the plan's interest rate
        const totalInterest = Math.ceil((principalAmount * interestRate * tenor.value) / 100);
        const totalAmount = principalAmount + totalInterest;
        const installmentAmount = Math.ceil(totalAmount / numberOfInstallments);

        // Update loan configuration
        await firestore.collection('crl_loans').doc(loanId).update({
          'configuration.interestRate': interestRate,
          'configuration.penaltyRate': penaltyRate,
          'configuration.totalInterest': totalInterest,
          'configuration.totalAmount': totalAmount,
          'configuration.installmentAmount': installmentAmount,
          amountRemaining: totalAmount - (loan.amountPaid || 0),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Updated loan ${loan.loanAccountNumber || loanId}:`);
        console.log(`   Interest Rate: 0% → ${interestRate}%`);
        console.log(`   Total Interest: ₦${loan.configuration.totalInterest || 0} → ₦${totalInterest}`);
        console.log(`   Total Amount: ₦${loan.configuration.totalAmount} → ₦${totalAmount}`);
        console.log(`   Installment: ₦${loan.configuration.installmentAmount} → ₦${installmentAmount}\n`);

        successCount++;

      } catch (error: any) {
        console.error(`❌ Error updating loan ${loanId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total loans found: ${loansSnapshot.size}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n✨ Backfill completed!');

  } catch (error: any) {
    console.error('Fatal error:', error);
    throw error;
  }
}

backfillLoanInterestRates()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
