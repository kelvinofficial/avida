export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  phone?: string;
  location?: string;
  bio?: string;
  verified: boolean;
  rating: number;
  total_ratings: number;
  created_at: string;
  blocked_users: string[];
  notifications_enabled: boolean;
}

export interface CategoryAttribute {
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  options?: string[];
  required: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
  attributes: CategoryAttribute[];
}

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  negotiable: boolean;
  category_id: string;
  subcategory?: string;
  condition?: string;
  images: string[];
  location: string;
  attributes: Record<string, any>;
  status: 'active' | 'sold' | 'deleted' | 'pending';
  featured: boolean;
  views: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  seller?: {
    user_id: string;
    name: string;
    picture?: string;
    rating: number;
    verified: boolean;
    created_at: string;
  };
  is_favorited?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message?: string;
  last_message_time?: string;
  buyer_unread: number;
  seller_unread: number;
  created_at: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
  };
  other_user?: {
    user_id: string;
    name: string;
    picture?: string;
  };
  unread: number;
  messages?: Message[];
}
