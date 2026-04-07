export interface Suggestion {
  id: number;
  user_id: number;
  type: 'bug' | 'suggestion';
  content: string;
  status: 'pending' | 'resolved';
  created_at: string;
  updated_at: string;
  user?: { id: number; name: string; email: string };
}
