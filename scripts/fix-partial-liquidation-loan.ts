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

interface RepaymentScheduleItem {
  scheduleId: string;
  loanId: string;
  installmentNumber: number;
  principalAmount: number;
  interestAmount: number;
  remainingPrincipal?: number;
  status: string;
  dueDate: Date;
  paidAmount?: number;
  accruedInterest?: number;
  lateFee: number;
  [key: string]: any;
}

async function fixPartialLiquidationLoan() {
  const loanId = 'a751f2ca-c73c-4d88-9865-01e7c7ebb99c';

  try {
    console.log(`\n🔧 Fixing loan: ${loanId}`);
    console.log('=' .repeat(60));

    // Get the loan
    const loanDoc = await firestore.collection('crl_loans').doc(loanId).get();
    
    if (!loanDoc.exists) {
      console.error('❌ Loan not found');
      process.exit(1);
    }

    const loan = loanDoc.data();
    console.log(`\n📊 Current Loan State:`);
    console.log(`Principal: ₦${loan?.principalAmount.toLocaleString()}`);
    console.log(`Amount Paid: ₦${loan?.amountPaid.toLocaleString()}`);
    console.log(`Amount Remaining: ₦${loan?.amountRemaining.toLocaleString()}`);
    console.log(`Current Installment: ${loan?.currentInstallment}`);

    // Get all current schedules
    const schedulesSnapshot = await firestore
      .collection('crl_repayment_schedules')
      .where('loanId', '==', loanId)
      .orderBy('installmentNumber', 'asc')
      .get();

    const schedules = schedulesSnapshot.docs.map(doc => ({
      scheduleId: doc.id,
      ...doc.data()
    })) as RepaymentScheduleItem[];

    console.log(`\n📅 Current Schedules (${schedules.length}):`);
    schedules.forEach(schedule => {
      console.log(`  #${schedule.installmentNumber}: Status=${schedule.status}, ` +
        `Principal=₦${schedule.principalAmount.toLocaleString()}, ` +
        `Remaining=₦${(schedule.remainingPrincipal || schedule.principalAmount).toLocaleString()}, ` +
        `Interest=₦${schedule.interestAmount.toLocaleString()}, ` +
        `Accrued=₦${(schedule.accruedInterest || 0).toLocaleString()}`);
    });

    // Calculate what the new schedules should be
    const paidSchedules = schedules.filter(s => s.status === 'success');
    const unpaidSchedules = schedules.filter(s => s.status !== 'success' && s.status !== 'deleted');

    console.log(`\n✅ Paid schedules: ${paidSchedules.length}`);
    console.log(`⏳ Unpaid schedules (non-deleted): ${unpaidSchedules.length}`);

    // Get the per-installment interest rate from a valid paid schedule
    const validSchedule = schedules.find(s => s.interestAmount && !isNaN(s.interestAmount) && s.interestAmount > 0);
    
    if (!validSchedule) {
      console.error('❌ No valid schedule found to calculate interest rate');
      process.exit(1);
    }
    
    const perInstallmentInterestRate = validSchedule.interestAmount / validSchedule.principalAmount;
    console.log(`\n📈 Per-Installment Interest Rate: ${(perInstallmentInterestRate * 100).toFixed(2)}%`);
    console.log(`   (Calculated from Schedule #${validSchedule.installmentNumber}: ₦${validSchedule.interestAmount} / ₦${validSchedule.principalAmount})`);

    // For each unpaid schedule, recalculate interest based on remaining principal
    const newSchedules: any[] = [];
    let totalRemainingAmount = 0;

    for (const schedule of unpaidSchedules) {
      const remainingPrincipal = schedule.remainingPrincipal || schedule.principalAmount;
      
      // Calculate prorated interest using the per-installment rate
      const proratedInterest = remainingPrincipal * perInstallmentInterestRate;
      
      const newSchedule = {
        ...schedule,
        interestAmount: proratedInterest,
        principalAmount: remainingPrincipal,
        remainingPrincipal: remainingPrincipal,
        accruedInterest: 0, // Reset accrued interest
        updatedAt: new Date(),
        metadata: {
          ...schedule.metadata,
          recalculated: true,
          recalculatedAt: new Date(),
          originalInterest: schedule.interestAmount,
          originalPrincipal: schedule.principalAmount,
        }
      };

      newSchedules.push(newSchedule);
      totalRemainingAmount += remainingPrincipal + proratedInterest;

      console.log(`\n  📝 Schedule #${schedule.installmentNumber}:`);
      console.log(`     Old: Principal=₦${schedule.principalAmount.toLocaleString()}, Interest=₦${schedule.interestAmount.toLocaleString()}`);
      console.log(`     New: Principal=₦${remainingPrincipal.toLocaleString()}, Interest=₦${proratedInterest.toFixed(2)}`);
    }

    console.log(`\n💰 New Total Remaining: ₦${totalRemainingAmount.toFixed(2)}`);

    // Confirm before proceeding
    console.log(`\n⚠️  This will:`);
    console.log(`   1. Reset accrued interest on ${paidSchedules.length} paid schedule(s) to ₦0`);
    console.log(`   2. Mark ${unpaidSchedules.length} old unpaid schedules as 'deleted'`);
    console.log(`   3. Create ${newSchedules.length} new schedules with recalculated interest`);
    console.log(`   4. Update loan amountRemaining to ₦${totalRemainingAmount.toFixed(2)}`);
    console.log(`   5. Update loan currentInstallment to ${paidSchedules.length}`);
    console.log(`\nProceed with fix? (This will run automatically in 3 seconds...)`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Execute the fix in a batch
    const batch = firestore.batch();

    // 1. Reset accrued interest on paid schedules
    for (const schedule of paidSchedules) {
      const scheduleRef = firestore.collection('crl_repayment_schedules').doc(schedule.scheduleId);
      batch.update(scheduleRef, {
        accruedInterest: 0,
        updatedAt: new Date(),
      });
    }

    // 2. Mark old unpaid schedules as deleted
    for (const schedule of unpaidSchedules) {
      const scheduleRef = firestore.collection('crl_repayment_schedules').doc(schedule.scheduleId);
      batch.update(scheduleRef, {
        status: 'deleted',
        deletedAt: new Date(),
        deletedReason: 'Recalculated after partial liquidation',
        updatedAt: new Date(),
      });
    }

    // 2. Create new schedules with recalculated interest
    for (const newSchedule of newSchedules) {
      const newScheduleId = `${loanId}_inst${newSchedule.installmentNumber}_v2`;
      const newScheduleRef = firestore.collection('crl_repayment_schedules').doc(newScheduleId);
      
      // Remove the old scheduleId and add the new one
      const { scheduleId, ...scheduleData } = newSchedule;
      
      batch.set(newScheduleRef, {
        ...scheduleData,
        scheduleId: newScheduleId,
        createdAt: new Date(),
        version: 2,
      });
    }

    // 4. Update loan amountRemaining and currentInstallment
    const loanRef = firestore.collection('crl_loans').doc(loanId);
    batch.update(loanRef, {
      amountRemaining: totalRemainingAmount,
      currentInstallment: paidSchedules.length, // Set to number of paid installments
      updatedAt: new Date(),
      metadata: {
        ...loan?.metadata,
        recalculated: true,
        recalculatedAt: new Date(),
      }
    });

    // Commit the batch
    await batch.commit();

    console.log(`\n✅ Fix completed successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Reset accrued interest on ${paidSchedules.length} paid schedule(s)`);
    console.log(`   - Marked ${unpaidSchedules.length} old unpaid schedules as deleted`);
    console.log(`   - Created ${newSchedules.length} new schedules`);
    console.log(`   - Updated loan amountRemaining to ₦${totalRemainingAmount.toFixed(2)}`);
    console.log(`   - Updated loan currentInstallment to ${paidSchedules.length}`);

    // Verify the changes
    console.log(`\n🔍 Verifying changes...`);
    
    const updatedLoanDoc = await firestore.collection('crl_loans').doc(loanId).get();
    const updatedLoan = updatedLoanDoc.data();
    
    const newSchedulesSnapshot = await firestore
      .collection('crl_repayment_schedules')
      .where('loanId', '==', loanId)
      .where('status', '!=', 'deleted')
      .orderBy('status', 'asc')
      .orderBy('installmentNumber', 'asc')
      .get();

    console.log(`\n✅ Updated Loan:`);
    console.log(`   Amount Remaining: ₦${updatedLoan?.amountRemaining.toLocaleString()}`);
    console.log(`\n✅ Active Schedules: ${newSchedulesSnapshot.size}`);
    newSchedulesSnapshot.docs.forEach(doc => {
      const schedule = doc.data();
      console.log(`   #${schedule.installmentNumber}: Principal=₦${schedule.principalAmount.toLocaleString()}, ` +
        `Interest=₦${schedule.interestAmount.toFixed(2)}, Status=${schedule.status}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Error fixing loan: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

fixPartialLiquidationLoan();
