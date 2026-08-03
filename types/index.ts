// ─── Shared TypeScript Types — Sultan Seafood ERP ───

export type Role = "OWNER" | "FINANCE" | "STAFF";

export type ProfileStatus = "PENDING" | "APPROVED" | "REJECTED";

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Product ───

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface Product {
  id: string;
  sku?: string;
  name: string;
  category: string;
  size?: string;
  defaultUnit: string;
  defaultSellingPrice?: number;
  status: ProductStatus;
  description?: string;
  activeCost?: number;
  estimatedMargin?: number;
  stockQuantity?: number;
  minimumStock?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Stock ───

export type StockMovementType =
  | "PURCHASE_IN"
  | "SALE_OUT"
  | "INVOICE_VOID_RETURN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export interface StockBalance {
  productId: string;
  productName: string;
  sku?: string;
  size?: string;
  unit: string;
  quantity: number;
  minimumQuantity: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  movementType: StockMovementType;
  quantityDelta: number;
  balanceAfter: number;
  supplierName?: string;
  customerName?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  notes?: string;
  occurredAt: string;
}

export interface ProductCost {
  id: string;
  productId: string;
  productName?: string;
  unit?: string;
  supplierId: string;
  supplierName: string;
  unitCost: number;
  effectiveAt: string;
  endedAt?: string;
  createdBy: string;
  createdAt: string;
}

// ─── Supplier ───

export type SupplierStatus = "ACTIVE" | "INACTIVE";

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  address: string;
  status: SupplierStatus;
}

// ─── Customer (Restoran) ───

export type CustomerStatus = "ACTIVE" | "INACTIVE";

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  billingAddress: string;
  shippingAddress?: string;
  paymentTermDays: number;
  status: CustomerStatus;
  notes?: string;
}

export interface CustomerPrice {
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  sellingPrice: number;
  defaultPrice?: number;
  effectiveAt: string;
  endedAt?: string;
}

// ─── Invoice ───

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type DirectCostCategory =
  | "PACKAGING"
  | "ICE"
  | "SHIPPING"
  | "FUEL"
  | "TOLL"
  | "PARKING"
  | "COURIER"
  | "PRODUCT_LOSS"
  | "OTHER";

export interface InvoiceItem {
  id: string;
  productId: string;
  descriptionSnapshot: string;
  unit: string;
  quantity: number;
  sellingPriceSnapshot: number;
  purchasePriceSnapshot: number;
  subtotal: number;
  totalPurchaseCost: number;
  productProfit: number;
}

export interface InvoiceDirectCost {
  id: string;
  category: DirectCostCategory;
  name: string;
  amount: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  publicToken?: string;
  invoiceNumber?: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  total: number;
  totalProductCost: number;
  totalDirectCost: number;
  productProfit: number;
  transactionProfit: number;
  transactionMargin: number;
  notes?: string;
  items: InvoiceItem[];
  directCosts: InvoiceDirectCost[];
  totalPaid: number;
  remainingBalance: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfilePublic {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  logoUrl?: string;
}

export interface PublicInvoiceItem {
  id: string;
  descriptionSnapshot: string;
  quantity: number;
  unit: string;
  sellingPriceSnapshot: number;
  subtotal: number;
}

export interface PublicInvoice {
  publicToken: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  items: PublicInvoiceItem[];
  company: CompanyProfilePublic;
}

// ─── Payment ───

export type PaymentMethod = "CASH" | "TRANSFER" | "CHECK" | "OTHER";

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  proofUrl?: string;
  proofPath?: string;
  notes?: string;
  createdBy: string;
}

// ─── Expense ───

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  createdAt: string;
}

// ─── Audit Log ───

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  entityName: string;
  entityId: string;
  action: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  createdAt: string;
}

// ─── Dashboard ───

export interface DashboardMetrics {
  ordersToday: number;
  ordersTodayChange: number;
  ordersThisWeek: number;
  ordersThisWeekChange: number;
  revenueThisMonth: number;
  revenueThisMonthChange: number;
  transactionProfitThisMonth: number;
  transactionMarginThisMonth: number;
  receivables: number;
  overdueCount: number;
  totalDirectCostsThisMonth: number;
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProfitDataPoint {
  date: string;
  profit: number;
  margin: number;
}

export interface InternalCostBreakdown {
  category: DirectCostCategory;
  label: string;
  amount: number;
}

// ─── Report ───

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  productId?: string;
  supplierId?: string;
  invoiceStatus?: InvoiceStatus;
}

export interface SalesReport {
  totalRevenue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    revenue: number;
    invoiceCount: number;
  }>;
  byProduct: Array<{
    productId: string;
    productName: string;
    revenue: number;
    quantity: number;
    unit: string;
  }>;
}

// ─── Navigation ───

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

// ─── Permissions ───

export type Permission =
  | "view_dashboard_full"
  | "view_purchase_price"
  | "view_profit"
  | "manage_products"
  | "manage_purchase_price"
  | "manage_selling_price"
  | "create_invoice_draft"
  | "issue_invoice"
  | "void_invoice"
  | "record_payment"
  | "manage_users"
  | "view_audit_log";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    "view_dashboard_full",
    "view_purchase_price",
    "view_profit",
    "manage_products",
    "manage_purchase_price",
    "manage_selling_price",
    "create_invoice_draft",
    "issue_invoice",
    "void_invoice",
    "record_payment",
    "manage_users",
    "view_audit_log",
  ],
  FINANCE: [
    "view_dashboard_full",
    "view_purchase_price",
    "view_profit",
    "manage_products",
    "manage_purchase_price",
    "manage_selling_price",
    "create_invoice_draft",
    "issue_invoice",
    "record_payment",
  ],
  STAFF: ["create_invoice_draft"],
};
