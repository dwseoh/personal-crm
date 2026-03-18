export interface Contact {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  created_at?: string;
  current_role?: string;
  company?: string;
  location?: string;
  importance?: number;
  group_ids?: string[];
}
