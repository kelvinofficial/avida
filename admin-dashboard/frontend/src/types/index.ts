// Admin Types
export interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  last_login?: string;
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT_AGENT = 'support_agent',
  FINANCE_ANALYST = 'finance_analyst'
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  description?: string;
  is_visible: boolean;
  seo_title?: string;
  seo_description?: string;
  order: number;
  attributes: CategoryAttribute[];
  children: Category[];
  listings_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  key: string;
  type: AttributeType;
  required: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
  order: number;
  conditions?: AttributeCondition[];
}

export type AttributeType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'dropdown' 
  | 'multiselect' 
  | 'boolean' 
  | 'date' 
  | 'year' 
  | 'range' 
  | 'rich_text';

export interface AttributeCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category_id: string;
  user_id: string;
  status: ListingStatus;
  images: string[];
  attributes?: Record<string, unknown>;
  featured: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  seller?: User;
}

export type ListingStatus = 'active' | 'pending' | 'rejected' | 'paused' | 'sold' | 'deleted';

export interface User {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  is_banned: boolean;
  ban_reason?: string;
  verified: boolean;
  created_at: string;
  stats?: {
    listings_count: number;
    reports_count: number;
  };
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  reported_listing_id?: string;
  reason: string;
  description: string;
  status: ReportStatus;
  resolution_notes?: string;
  created_at: string;
}

export type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed' | 'escalated';

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  category: string;
  status: string;
  assigned_to?: string;
  responses: TicketResponse[];
  created_at: string;
  updated_at: string;
}

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketResponse {
  id: string;
  admin_id: string;
  admin_name: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AnalyticsOverview {
  users: {
    total: number;
    new_30d: number;
    new_7d: number;
  };
  listings: {
    total: number;
    active: number;
    pending: number;
    new_7d: number;
  };
  reports: {
    pending: number;
  };
  tickets: {
    open: number;
  };
  generated_at: string;
}
