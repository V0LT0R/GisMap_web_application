export type AuditLogItem = {
  id: number;
  user_id?: number | null;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description?: string | null;
  meta_json?: string | null;
  created_at: string;
};

export type AuditLogListResponse = {
  items: AuditLogItem[];
  total: number;
  limit: number;
  offset: number;
};
