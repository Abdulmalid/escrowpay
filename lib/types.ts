export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD';
export type PayoutCurrency = 'NGN' | 'KES' | 'GHS' | 'USD' | 'USDC';

export type ContractStatus = 
  | 'AWAITING_DEPOSIT'
  | 'ESCROWED_HEDGED'
  | 'WORK_IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type MilestoneStatus = 
  | 'PENDING_DEPOSIT'
  | 'ESCROWED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'DISBURSED';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  percentage: number;
  status: MilestoneStatus;
  submissionUrl?: string;
  submittedAt?: string;
  approvedAt?: string;
  payoutRef?: string;
  /** Set while a payout is being dispatched; prevents double-disbursement. */
  payoutInFlightAt?: string;
}

export interface BlaaizVirtualAccount {
  id: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  sortCode?: string;
  swiftBic?: string;
  bankName: string;
  accountName: string;
  currency: Currency;
  merchantReference: string;
  country: string;
  expiresAt: string;
}

export interface BlaaizPayoutResult {
  id: string;
  merchantReference: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'PROCESSING' | 'FAILED';
  recipient: string;
  fee: number;
  exchangeRate?: number;
  estimatedDelivery: string;
  blaaizRef: string;
  timestamp: string;
}

export interface HedgeDetails {
  hedgedTo: 'USDC' | 'USDT';
  amountHedged: number;
  initialFxRate: number; // e.g. 1 USD = 1,650 NGN
  currentFxRate: number; // e.g. 1 USD = 1,740 NGN
  valueSavedNgn: number;
  swappedAt: string;
  txHash: string;
}

export interface Contract {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientEmail: string;
  freelancerName: string;
  freelancerEmail: string;
  freelancerCountry: string;
  totalAmount: number;
  currency: Currency;
  targetPayoutCurrency: PayoutCurrency;
  payoutMethod: 'bank_transfer' | 'mobile_money' | 'crypto_stablecoin';
  payoutDetails: {
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    mobileNumber?: string;
    networkProvider?: string;
    cryptoWalletAddress?: string;
    cryptoNetwork?: 'Polygon' | 'Ethereum' | 'Solana';
  };
  autoHedgeStablecoin: boolean;
  status: ContractStatus;
  createdAt: string;
  virtualAccount?: BlaaizVirtualAccount;
  milestones: Milestone[];
  hedgeDetails?: HedgeDetails;
  payoutTransaction?: BlaaizPayoutResult;
}

export interface BlaaizLogEntry {
  id: string;
  type: 'API_CALL' | 'WEBHOOK_RECEIVED' | 'SWAP_EXECUTED' | 'PAYOUT_DISBURSED';
  endpoint?: string;
  status: 'SUCCESS' | 'INFO' | 'WARNING';
  title: string;
  details: Record<string, any>;
  timestamp: string;
}
