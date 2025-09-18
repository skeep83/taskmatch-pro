export interface PresenceState {
  [key: string]: {
    user_id: string;
    username: string;
    avatar_url?: string;
    page: string;
    joined_at: string;
    last_seen: string;
    user_agent?: string;
    location?: string;
    user_type?: string;
  }[];
}

export interface UserTypeStats {
  client: number;
  pro: number;
  business: number;
  guest: number;
  unregistered: number;
  total: number;
}

export interface UserTypeInfo {
  type: string;
  count: number;
  label: string;
  icon: any;
  color: string;
  position?: { top?: string; right?: string; bottom?: string; left?: string };
}