export enum DeviceStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
  OFFLINE = "Offline",
}

export enum DeviceType {
  QR = "QR",
  TABLET = "Tablet",
  KIOSK = "Kiosk",
}

export enum OrderStatus {
  PAID = "Paid",
  PARTIALLY_PAID = "Partially Paid",
  FULFILLED = "Fulfilled",
  RETURNED = "Returned",
  PENDING = "Pending",
}

export interface Partner {
  id: number;
  email: string;
  firebaseUid?: string;
  isSuperAdmin: boolean;
  superAdminRole: string | null;
  companyId: number | null;
  companyName: string | null;
  companyRole: string | null;
  name?: string;
  token?: string;
  is_active: boolean;
}

export interface Company {
  _id: string; // Sanity ID
  company_id: string;
  company_name: string;
  abn: string;
  company_abn: string;
  created_at: string;
}

export interface Location {
  _id: string; // Sanity ID
  location_id: string; // internal
  partner_id: string; // company_id
  location_name: string;
  attio_location_id: string; // external system ID
}

export interface OrderItem {
  product_id?: string;
  title: string;
  sku?: string | null; // can be null if missing
  quantity: number;
  price: number;
}

export interface Order {
  id: string; // shopify order id
  order_name: string;
  order_date: string;
  status: OrderStatus;

  partner_id: string; // company_id
  location_id: string;
  kiosk_id: string;

  shopify_customer_id?: string | null;
  customer_name: string;

  total_ex_gst: number;
  total_amount: number; // subtotal + taxes - discounts

  items: OrderItem[];
}

export interface Device {
  device_id: string;
  internalId: string;
  partner_id: string; // company_id
  device_type: DeviceType;
  status: DeviceStatus;
}

export interface SupportIssue {
  issue_id: string;
  partner_id: string;
  location_id: string;
  device_id?: string;
  title: string;
  description: string;
  created_at: string;
  status: "Open" | "Resolved";
}

export interface Feedback {
  feedback_id: string;
  partner_id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

// ================= HELPER TYPES =================

export interface UserSession {
  partner: Partner;
  isAuthenticated: boolean;
}

export interface IUser {
  id: number;
  firebase_uid: string;
  email: string;
  role: string | null;
  company_id?: string;
  created_at?: string;
}
