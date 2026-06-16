export interface UserPermissions {
  managePo: boolean;
  manageApv: boolean;
  manageTreasury: boolean;
  deleteRecords: boolean;
  manageUsers: boolean;
  systemAdmin: boolean;
  exportData: boolean;
}

export interface OrderItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  itemType: 'Goods' | 'Services';
  taxRate: number; // e.g. 12 for 12%, 0 for VAT-Exempt/Zero Rated
  taxAmount: number; // calculated tax for this line item
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
  taxAmount?: number; // total tax calculated for the entire PO
  paymentTerms: string;
  remarks: string;
  attachmentData: string;
  status: string;
  items?: OrderItem[];
}

export interface ApvRecord {
  id: string;
  poId: string;
  businessUnit?: string;
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
  withheldTax?: number;
  originalAmount?: number;
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
