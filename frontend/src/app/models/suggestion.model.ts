export interface Suggestion {
  id: number;
  user_id: number;
  type: 'bug' | 'suggestion' | 'landing_page';
  content: string;
  status: 'pending' | 'resolved' | 'unresolved';
  created_at: string;
  updated_at: string;
  user?: { id: number; name: string; email: string };
  club?: { id: number; name: string };
}
