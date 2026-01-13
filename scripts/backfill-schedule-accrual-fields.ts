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

async function backfillScheduleAccrualFields() {
  console.log('Starting backfill of repayment schedule accrual fields...\n');

  try {
    // Get all repayment schedules
    const schedulesSnapshot = await firestore
      .collection('crl_repayment_schedules')
      .get();

    if (schedulesSnapshot.empty) {
      console.log('No repayment schedules found.');
      return;
    }

    console.log(`Found ${schedulesSnapshot.size} repayment schedules to process.\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const doc of schedulesSnapshot.docs) {
      const schedule = doc.data();
      const scheduleId = doc.id;

      try {
        // Check if fields already exist
        if (
          schedule.hasOwnProperty('accruedInterest') &&
          schedule.hasOwnProperty('remainingPrincipal') &&
          schedule.hasOwnProperty('originalPrincipal')
        ) {
          console.log(`⏭️  Skipping ${scheduleId} - already has accrual fields`);
          skipCount++;
          continue;
        }

        // Determine values based on status
        const isPaid = schedule.status === 'success';
        const principalAmount = schedule.principalAmount || 0;

        const updates: any = {
          accruedInterest: 0, // Will be calculated by daily accrual job
          remainingPrincipal: isPaid ? 0 : principalAmount,
          originalPrincipal: principalAmount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Update the schedule
        await firestore
          .collection('crl_repayment_schedules')
          .doc(scheduleId)
          .update(updates);

        console.log(`✅ Updated ${scheduleId} (Status: ${schedule.status}, Principal: ₦${principalAmount})`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Error updating ${scheduleId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total schedules: ${schedulesSnapshot.size}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⏭️  Skipped (already updated): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n✨ Backfill completed!');
  } catch (error: any) {
    console.error('Fatal error during backfill:', error);
    throw error;
  }
}

// Run the backfill
backfillScheduleAccrualFields()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
