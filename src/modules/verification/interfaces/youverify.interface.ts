export interface BvnVerificationRequest {
  id: string; // BVN number
  isSubjectConsent: boolean;
  metadata?: {
    requestId?: string;
    customerId?: string;
    merchantId?: string;
  };
}

export interface BvnVerificationResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;
    phoneNumber: string;
    bvn: string;
    gender: string;
    nationality: string;
    stateOfOrigin: string;
    lgaOfOrigin: string;
    enrollmentBank: string;
    enrollmentBranch: string;
    watchListed: boolean;
    image?: string; // Base64 encoded image
  };
}

export interface NinVerificationRequest {
  id: string; // NIN number
  isSubjectConsent: boolean;
  metadata?: {
    requestId?: string;
    customerId?: string;
    merchantId?: string;
  };
}

export interface NinVerificationResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;
    phoneNumber: string;
    nin: string;
    gender: string;
    trackingId: string;
    photo?: string; // Base64 encoded photo
  };
}

export interface VerificationResult {
  verified: boolean;
  provider: 'youverify';
  verifiedAt: Date;
  data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;
    phoneNumber?: string;
    gender?: string;
    photo?: string;
    watchListed?: boolean;
  };
  metadata?: any;
}
