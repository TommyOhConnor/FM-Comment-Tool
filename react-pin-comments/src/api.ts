import type { Comment, SupabaseConfig } from './types';

/**
 * Supabase PostgREST API client for pin comments.
 * Communicates directly with Supabase — no custom server needed.
 */
export class CommentAPI {
  private config: SupabaseConfig;
  private tableName: string;

  constructor(config: SupabaseConfig, tableName: string = 'pin_comments') {
    this.config = config;
    this.tableName = tableName;
  }

  private get headers() {
    return {
      'apikey': this.config.anonKey,
      'Authorization': `Bearer ${this.config.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  private get baseUrl() {
    return `${this.config.url}/rest/v1/${this.tableName}`;
  }

  async fetchComments(): Promise<Comment[]> {
    const response = await fetch(
      `${this.baseUrl}?order=created_at.asc`,
      { headers: this.headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch comments: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return (data || []).map((c: any) => ({
      ...c,
      page: c.page || '/',
      replies: c.replies || [],
    }));
  }

  async addComment(comment: Comment): Promise<Comment> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        id: comment.id,
        x: comment.x,
        y: comment.y,
        text: comment.text,
        page: comment.page,
        author: comment.author || null,
        replies: comment.replies || [],
        created_at: comment.timestamp,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add comment: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data[0] || comment;
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<void> {
    const body: Record<string, any> = {};
    if (updates.replies !== undefined) body.replies = updates.replies;
    if (updates.text !== undefined) body.text = updates.text;
    if (updates.author !== undefined) body.author = updates.author;

    const response = await fetch(
      `${this.baseUrl}?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update comment: ${response.status} ${errorText}`);
    }
  }

  async deleteComment(id: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete comment: ${response.status} ${errorText}`);
    }
  }

  /**
   * Tests the connection by attempting to read from the table.
   * Returns true if the table is accessible, false otherwise.
   */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}?limit=1`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        // Check for common errors
        if (response.status === 404 || errorText.includes('relation') && errorText.includes('does not exist')) {
          return { ok: false, error: 'Table not found. Please run the setup SQL in your Supabase dashboard.' };
        }
        if (response.status === 401) {
          return { ok: false, error: 'Authentication failed. Please check your anon key.' };
        }
        return { ok: false, error: `Connection failed: ${response.status} ${errorText}` };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: `Could not reach Supabase: ${error}` };
    }
  }
}
