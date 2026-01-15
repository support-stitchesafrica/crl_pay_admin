import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

// Load environment variables
dotenv.config();

/**
 * Migration Script: Backfill financingPlanId for existing loans
 * 
 * This script updates all existing loans to include the financingPlanId
 * based on their merchant's active plan mapping.
 */

async function backfillLoanFinancingPlans() {
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
  
  console.log('Starting migration: Backfill financingPlanId for existing loans...\n');

  try {
    // Fetch all loans
    const loansSnapshot = await firestore.collection('crl_loans').get();
    console.log(`Found ${loansSnapshot.size} total loans\n`);

    // Fetch all active plan mappings
    const mappingsSnapshot = await firestore
      .collection('crl_plan_merchant_mappings')
      .where('status', '==', 'active')
      .get();

    // Create a map of merchantId -> planId/financierId
    const merchantPlanMap = new Map();
    mappingsSnapshot.forEach((doc) => {
      const mapping = doc.data();
      merchantPlanMap.set(mapping.merchantId, {
        planId: mapping.planId,
        financierId: mapping.financierId,
      });
    });

    console.log(`Found ${merchantPlanMap.size} active merchant plan mappings\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let noMappingCount = 0;

    // Update each loan
    for (const doc of loansSnapshot.docs) {
      const loan = doc.data();
      const loanId = doc.id;

      // Skip if already has financingPlanId
      if (loan.financingPlanId) {
        console.log(`✓ Loan ${loanId} already has financingPlanId: ${loan.financingPlanId}`);
        skippedCount++;
        continue;
      }

      // Get plan mapping for this merchant
      const planMapping = merchantPlanMap.get(loan.merchantId);

      if (!planMapping) {
        console.log(`⚠ Loan ${loanId} - No active plan mapping found for merchant: ${loan.merchantId}`);
        noMappingCount++;
        continue;
      }

      // Update the loan with financingPlanId and financierId
      await firestore.collection('crl_loans').doc(loanId).update({
        financingPlanId: planMapping.planId,
        financierId: planMapping.financierId,
        updatedAt: new Date(),
      });

      console.log(`✓ Updated loan ${loanId} with planId: ${planMapping.planId}`);
      updatedCount++;
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total loans: ${loansSnapshot.size}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Already had planId: ${skippedCount}`);
    console.log(`No mapping found: ${noMappingCount}`);
    console.log('========================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
backfillLoanFinancingPlans()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
