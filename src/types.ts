export interface UserPermissions {
  managePo: boolean;
  manageApv: boolean;
  manageTreasury: boolean;
  deleteRecords: boolean;
  manageUsers: boolean;
  systemAdmin: boolean;
  exportData: boolean;
}

export interface PurchaseOrder {
  id: string;
  category: string;
  prRequestor: string;
  processorName: string;
  prReceivedDate: string;
  date: string;
  expectedDelivery: string;
  receivedDate: string | null;
  vendor: string;
  description: string;
  amount: number;
  grossAmount: number;
  discountAmount: number;
  paymentTerms: string;
  remarks: string;
  attachmentData: string;
  status: string;
}

export interface ApvRecord {
  id: string;
  poId: string;
  businessUnit: 'ETMC' | 'EMI' | 'EHI' | string;
  category: string;
  vendor: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  funded: boolean;
  fundedDate: string | null;
  settledDate: string | null;
  paymentTerms: string;
  status: 'Unpaid' | 'Paid';
  checkNumber: string;
  checkDate: string;
  releaseDate: string | null;
  checkStatus: string;
}

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  department?: string;
  permissions: UserPermissions;
  accessLevel?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}
