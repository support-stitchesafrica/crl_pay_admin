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

async function backfillLoanPenaltyRates() {
  console.log('🔧 Backfilling loan penalty rates from financing plans...\n');

  try {
    // Get all loans
    const loansSnapshot = await firestore.collection('crl_loans').get();

    if (loansSnapshot.empty) {
      console.log('❌ No loans found');
      return;
    }

    console.log(`Found ${loansSnapshot.size} loans to check\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const loanDoc of loansSnapshot.docs) {
      const loan = loanDoc.data();
      const loanId = loanDoc.id;

      try {
        // Skip if already has lateFee object
        if (loan.configuration?.lateFee && typeof loan.configuration.lateFee === 'object') {
          console.log(`⏭️  Loan ${loan.loanAccountNumber || loanId} already has lateFee object, skipping`);
          skippedCount++;
          continue;
        }

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
        const lateFee = plan?.lateFee;

        if (!lateFee) {
          console.log(`⚠️  Financing plan ${planId} has no lateFee, skipping loan ${loan.loanAccountNumber || loanId}`);
          errorCount++;
          continue;
        }

        // Update loan configuration with lateFee object
        await firestore.collection('crl_loans').doc(loanId).update({
          'configuration.lateFee': lateFee,
          'configuration.penaltyRate': lateFee.type === 'percentage' ? lateFee.amount : 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Updated loan ${loan.loanAccountNumber || loanId}:`);
        console.log(`   Old penaltyRate: ${loan.configuration?.penaltyRate || 'N/A'}%`);
        console.log(`   New lateFee: ${lateFee.type} - ${lateFee.amount}${lateFee.type === 'percentage' ? '%' : ' NGN'}\n`);

        successCount++;

      } catch (error: any) {
        console.error(`❌ Error updating loan ${loanId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total loans: ${loansSnapshot.size}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⏭️  Skipped (already updated): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n✨ Backfill completed!');

  } catch (error: any) {
    console.error('Fatal error:', error);
    throw error;
  }
}

backfillLoanPenaltyRates()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
