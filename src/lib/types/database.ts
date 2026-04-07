export type Profile = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type Board = {
  id: string
  title: string
  owner_id: string
  share_token: string | null
  share_role: 'editor' | 'viewer'
  created_at: string
  updated_at: string
}

export type BoardMember = {
  board_id: string
  user_id: string
  role: 'editor' | 'viewer'
  created_at: string
}

export type BoardItem = {
  id: string
  board_id: string
  type: 'note' | 'text' | 'rect' | 'arrow' | 'triangle' | 'circle' | 'freehand' | 'emoji'
  x: number
  y: number
  width: number
  height: number
  content: string
  color: string
  z_index: number
  created_by: string | null
  created_at: string
  updated_at: string
  font_size: number
  font_family: string
  stroke_color: string
  stroke_width: number
  points: Array<{ x: number; y: number }> | null
  padding: number
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>
        Update: Partial<Profile>
        Relationships: []
      }
      boards: {
        Row: Board
        Insert: Partial<Board> & Pick<Board, 'owner_id'>
        Update: Partial<Board>
        Relationships: []
      }
      board_members: {
        Row: BoardMember
        Insert: Omit<BoardMember, 'created_at'> & { created_at?: string }
        Update: Partial<BoardMember>
        Relationships: []
      }
      board_items: {
        Row: BoardItem
        Insert: Partial<BoardItem> & Pick<BoardItem, 'board_id' | 'type' | 'id'>
        Update: Partial<BoardItem>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
