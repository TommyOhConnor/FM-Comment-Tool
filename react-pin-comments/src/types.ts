export interface Reply {
  id: string;
  text: string;
  author?: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  timestamp: string;
  page: string;
  author?: string;
  replies?: Reply[];
  created_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface CommentWidgetProps {
  /** Supabase project URL — if provided with anonKey, skips setup wizard */
  supabaseUrl?: string;
  /** Supabase anon/public key */
  supabaseAnonKey?: string;
  /** Database table name (default: 'pin_comments') */
  tableName?: string;
  /** localStorage key prefix (default: 'pin-comments:') */
  storagePrefix?: string;
  /** Position of the floating action button */
  position?: 'bottom-right' | 'bottom-left';
}
