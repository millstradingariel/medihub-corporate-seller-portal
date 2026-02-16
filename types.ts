/// <reference types="@types/google.maps" />


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
  name: string | null;
  firebaseUid: string;
  is_active: number;

    // Role information
  roleId: number;
  roleType: 'corporate' | 'company';
  
  // Corporate user fields
  isSuperAdmin: boolean;
  superAdminRole?: string;           // e.g., 'super_admin', 'admin', 'viewer'
  superAdminRoleDisplay?: string;    // e.g., 'Super Administrator', 'Administrator'
  
  // Company user fields
  companyId?: string;
  companyName?: string;
  companyRole?: string;              // e.g., 'company_super_admin', 'company_admin'
  companyRoleDisplay?: string; 
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
  _id: string;
  location_id: string;
  location_name: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postcode?: string;
  shipping_state?: string;
}

export interface OrderItem {
  order_id: string;
  title: string;
  sku?: string;
  quantity: number;
  price: number;
}

export interface Order {
  shopify_order_id: string;
  order_name?: string;
  order_date: string;
  kiosk_id?: string;
  shopify_customer_id?: string;
  customer_name?: string;
  status?: string;
  total_ex_gst: number;
  items?: OrderItem[];
}

export interface Device {
  device_id: string;
  internalId: string;
  partner_id: string;
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

export interface UserSession {
  partner: Partner;
  isAuthenticated: boolean;
}

export interface IUser {
  id: number;
  firebase_uid: string;
  name: string;
  email: string;
  role: string | null;
  created_at?: string;
}

