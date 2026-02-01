export interface Admin {
  adminId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'admin' | 'finance' | 'support';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
