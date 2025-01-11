export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      topic_trees: {
        Row: {
          id: string
          title: string
          tree_data: Json
          created_at: string
          user_id: string
          document_ids: string[]
        }
        Insert: {
          id?: string
          title: string
          tree_data: Json
          created_at?: string
          user_id: string
          document_ids?: string[]
        }
        Update: {
          id?: string
          title?: string
          tree_data?: Json
          created_at?: string
          user_id?: string
          document_ids?: string[]
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          content: string
          file_type: string
          created_at: string
          user_id: string
          metadata: Json
        }
        Insert: {
          id?: string
          title: string
          content: string
          file_type: string
          created_at?: string
          user_id: string
          metadata?: Json
        }
        Update: {
          id?: string
          title?: string
          content?: string
          file_type?: string
          created_at?: string
          user_id?: string
          metadata?: Json
        }
      }
    }
  }
}