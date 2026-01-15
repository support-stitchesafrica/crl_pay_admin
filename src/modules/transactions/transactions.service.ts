import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.config';
import { Transaction } from '../../entities/transaction.entity';
import { PaystackService } from '../payments/paystack.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private firebaseService: FirebaseService,
    private paystackService: PaystackService,
  ) {}

  async getAllTransactions(filters: {
    type?: string;
    status?: string;
    merchantId?: string;
    loanId?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    const db = this.firebaseService.getFirestore();
    let query: any = db
      .collection('crl_transactions')
      .orderBy('createdAt', 'desc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    let transactions = snapshot.docs.map((doc) => doc.data() as Transaction);

    // Apply in-memory filters
    if (filters.type) {
      transactions = transactions.filter((t) => t.type === filters.type);
    }
    if (filters.status) {
      transactions = transactions.filter((t) => t.status === filters.status);
    }
    if (filters.merchantId) {
      transactions = transactions.filter(
        (t) => t.merchantId === filters.merchantId,
      );
    }
    if (filters.loanId) {
      transactions = transactions.filter((t) => t.loanId === filters.loanId);
    }

    this.logger.log(
      `Retrieved ${transactions.length} transactions with filters: ${JSON.stringify(filters)}`,
    );
    return transactions;
  }

  async getTransactionById(transactionId: string): Promise<Transaction> {
    const db = this.firebaseService.getFirestore();
    const doc = await db
      .collection('crl_transactions')
      .doc(transactionId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException('Transaction not found');
    }

    return doc.data() as Transaction;
  }

  async getTransactionsByMerchant(
    merchantId: string,
    limit: number = 50,
  ): Promise<Transaction[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('crl_transactions')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const transactions = snapshot.docs
      .map((doc) => doc.data() as Transaction)
      .filter((t) => t.merchantId === merchantId);

    return transactions;
  }

  async getTransactionsByLoan(loanId: string): Promise<Transaction[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('crl_transactions')
      .orderBy('createdAt', 'desc')
      .get();

    const transactions = snapshot.docs
      .map((doc) => doc.data() as Transaction)
      .filter((t) => t.loanId === loanId);

    return transactions;
  }

  async requeryTransaction(
    transactionId: string,
    provider?: string,
  ): Promise<{
    transaction: Transaction;
    providerStatus?: any;
    updated: boolean;
  }> {
    const transaction = await this.getTransactionById(transactionId);

    this.logger.log(
      `Requerying transaction ${transactionId} with provider ${transaction.provider}`,
    );

    let providerStatus: any = null;
    let updated = false;

    // If transaction has a provider reference, verify with the provider
    if (
      transaction.providerReference &&
      transaction.provider === 'paystack'
    ) {
      try {
        // Detect if this is a transfer reference (starts with TRF_) or transaction reference
        const isTransfer = transaction.providerReference.startsWith('TRF_');
        
        if (isTransfer) {
          // Use transfer verification endpoint
          this.logger.log(`Detected transfer reference, using verifyTransfer`);
          providerStatus = await this.paystackService.verifyTransfer(
            transaction.providerReference,
          );
        } else {
          // Use transaction verification endpoint
          this.logger.log(`Detected transaction reference, using verifyTransaction`);
          providerStatus = await this.paystackService.verifyTransaction(
            transaction.providerReference,
          );
        }

        this.logger.log(
          `Provider status for ${transactionId}: ${providerStatus.data?.status || providerStatus.status}`,
        );

        // Update transaction status if it differs from provider
        // Handle both transaction and transfer response formats
        const providerStatusValue = providerStatus.data?.status || providerStatus.status;
        const providerStatusMap: Record<string, string> = {
          success: 'success',
          failed: 'failed',
          pending: 'pending',
        };

        const newStatus = providerStatusMap[providerStatusValue];
        if (newStatus && newStatus !== transaction.status) {
          const db = this.firebaseService.getFirestore();
          await db.collection('crl_transactions').doc(transactionId).update({
            status: newStatus,
            updatedAt: new Date(),
            metadata: {
              ...transaction.metadata,
              lastRequery: new Date().toISOString(),
              providerStatusUpdate: providerStatus,
            },
          });

          updated = true;
          transaction.status = newStatus as any;
          this.logger.log(
            `Updated transaction ${transactionId} status from ${transaction.status} to ${newStatus}`,
          );
        }
      } catch (error: any) {
        this.logger.error(
          `Error requerying transaction ${transactionId}:`,
          error.message,
        );
        
        // Provide detailed error information
        let errorMessage = error.message;
        if (error.response?.status === 404) {
          errorMessage = 'Transfer not found in payment provider. It may not have been created yet or the reference is invalid.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Invalid request to payment provider. The reference format may be incorrect.';
        }
        
        providerStatus = { 
          error: errorMessage,
          statusCode: error.response?.status,
          details: error.response?.data
        };
      }
    }

    return {
      transaction,
      providerStatus,
      updated,
    };
  }
}
