// Generated from the Supabase schema (equivalent to `supabase gen types typescript`).
// Regenerate with: npx supabase gen types typescript --project-id abrhdxxalkqjvrbzetty > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	__InternalSupabase: { PostgrestVersion: '14.18' };
	public: {
		Tables: {
			announcement_reads: {
				Row: { announcement_id: string; read_at: string; user_id: string };
				Insert: { announcement_id: string; read_at?: string; user_id: string };
				Update: { announcement_id?: string; read_at?: string; user_id?: string };
				Relationships: [{ foreignKeyName: 'announcement_reads_announcement_id_fkey'; columns: ['announcement_id']; isOneToOne: false; referencedRelation: 'announcements'; referencedColumns: ['id'] }, { foreignKeyName: 'announcement_reads_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			announcements: {
				Row: { author_id: string | null; body: string; created_at: string; id: string; is_pinned: boolean; term_id: string; title: string };
				Insert: { author_id?: string | null; body: string; created_at?: string; id?: string; is_pinned?: boolean; term_id: string; title: string };
				Update: { author_id?: string | null; body?: string; created_at?: string; id?: string; is_pinned?: boolean; term_id?: string; title?: string };
				Relationships: [{ foreignKeyName: 'announcements_author_id_fkey'; columns: ['author_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'announcements_term_id_fkey'; columns: ['term_id']; isOneToOne: false; referencedRelation: 'terms'; referencedColumns: ['id'] }];
			};
			attendance_records: {
				Row: { accuracy_m: number | null; checked_in_at: string; distance_m: number | null; latitude: number | null; longitude: number | null; marked_by: string | null; method: string; session_id: string; student_id: string };
				Insert: { accuracy_m?: number | null; checked_in_at?: string; distance_m?: number | null; latitude?: number | null; longitude?: number | null; marked_by?: string | null; method?: string; session_id: string; student_id: string };
				Update: { accuracy_m?: number | null; checked_in_at?: string; distance_m?: number | null; latitude?: number | null; longitude?: number | null; marked_by?: string | null; method?: string; session_id?: string; student_id?: string };
				Relationships: [{ foreignKeyName: 'attendance_records_marked_by_fkey'; columns: ['marked_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'attendance_records_session_id_fkey'; columns: ['session_id']; isOneToOne: false; referencedRelation: 'attendance_sessions'; referencedColumns: ['id'] }, { foreignKeyName: 'attendance_records_student_id_fkey'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			attendance_sessions: {
				Row: { ended_at: string | null; id: string; is_open: boolean; latitude: number | null; longitude: number | null; radius_m: number; require_location: boolean; rotate_seconds: number; started_at: string; started_by: string | null; term_id: string; title: string };
				Insert: { ended_at?: string | null; id?: string; is_open?: boolean; latitude?: number | null; longitude?: number | null; radius_m?: number; require_location?: boolean; rotate_seconds?: number; started_at?: string; started_by?: string | null; term_id: string; title: string };
				Update: { ended_at?: string | null; id?: string; is_open?: boolean; latitude?: number | null; longitude?: number | null; radius_m?: number; require_location?: boolean; rotate_seconds?: number; started_at?: string; started_by?: string | null; term_id?: string; title?: string };
				Relationships: [{ foreignKeyName: 'attendance_sessions_started_by_fkey'; columns: ['started_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'attendance_sessions_term_id_fkey'; columns: ['term_id']; isOneToOne: false; referencedRelation: 'terms'; referencedColumns: ['id'] }];
			};
			comments: {
				Row: { body: string; content_id: string; created_at: string; id: string; is_resolved: boolean; parent_id: string | null; user_id: string };
				Insert: { body: string; content_id: string; created_at?: string; id?: string; is_resolved?: boolean; parent_id?: string | null; user_id: string };
				Update: { body?: string; content_id?: string; created_at?: string; id?: string; is_resolved?: boolean; parent_id?: string | null; user_id?: string };
				Relationships: [{ foreignKeyName: 'comments_content_id_fkey'; columns: ['content_id']; isOneToOne: false; referencedRelation: 'contents'; referencedColumns: ['id'] }, { foreignKeyName: 'comments_parent_id_fkey'; columns: ['parent_id']; isOneToOne: false; referencedRelation: 'comments'; referencedColumns: ['id'] }, { foreignKeyName: 'comments_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			content_views: {
				Row: { content_id: string; first_viewed_at: string; last_viewed_at: string; user_id: string; view_count: number };
				Insert: { content_id: string; first_viewed_at?: string; last_viewed_at?: string; user_id: string; view_count?: number };
				Update: { content_id?: string; first_viewed_at?: string; last_viewed_at?: string; user_id?: string; view_count?: number };
				Relationships: [{ foreignKeyName: 'content_views_content_id_fkey'; columns: ['content_id']; isOneToOne: false; referencedRelation: 'contents'; referencedColumns: ['id'] }, { foreignKeyName: 'content_views_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			contents: {
				Row: { body: string | null; created_at: string; created_by: string | null; duration_seconds: number | null; external_url: string | null; file_name: string | null; id: string; is_published: boolean; mime_type: string | null; position: number; section: string | null; size_bytes: number | null; storage_path: string | null; term_id: string; title: string; type: Database["public"]["Enums"]["content_type"]; updated_at: string };
				Insert: { body?: string | null; created_at?: string; created_by?: string | null; duration_seconds?: number | null; external_url?: string | null; file_name?: string | null; id?: string; is_published?: boolean; mime_type?: string | null; position?: number; section?: string | null; size_bytes?: number | null; storage_path?: string | null; term_id: string; title: string; type: Database["public"]["Enums"]["content_type"]; updated_at?: string };
				Update: { body?: string | null; created_at?: string; created_by?: string | null; duration_seconds?: number | null; external_url?: string | null; file_name?: string | null; id?: string; is_published?: boolean; mime_type?: string | null; position?: number; section?: string | null; size_bytes?: number | null; storage_path?: string | null; term_id?: string; title?: string; type?: Database["public"]["Enums"]["content_type"]; updated_at?: string };
				Relationships: [{ foreignKeyName: 'contents_created_by_fkey'; columns: ['created_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'contents_term_id_fkey'; columns: ['term_id']; isOneToOne: false; referencedRelation: 'terms'; referencedColumns: ['id'] }];
			};
			conversations: {
				Row: { created_at: string; id: string; last_message_at: string; last_message_preview: string | null; student_id: string; tutor_id: string };
				Insert: { created_at?: string; id?: string; last_message_at?: string; last_message_preview?: string | null; student_id: string; tutor_id: string };
				Update: { created_at?: string; id?: string; last_message_at?: string; last_message_preview?: string | null; student_id?: string; tutor_id?: string };
				Relationships: [{ foreignKeyName: 'conversations_student_id_fkey'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'conversations_tutor_id_fkey'; columns: ['tutor_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			enrollments: {
				Row: { decided_at: string | null; decided_by: string | null; id: string; message: string | null; requested_at: string; status: Database["public"]["Enums"]["enrollment_status"]; student_id: string; term_id: string };
				Insert: { decided_at?: string | null; decided_by?: string | null; id?: string; message?: string | null; requested_at?: string; status?: Database["public"]["Enums"]["enrollment_status"]; student_id: string; term_id: string };
				Update: { decided_at?: string | null; decided_by?: string | null; id?: string; message?: string | null; requested_at?: string; status?: Database["public"]["Enums"]["enrollment_status"]; student_id?: string; term_id?: string };
				Relationships: [{ foreignKeyName: 'enrollments_decided_by_fkey'; columns: ['decided_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'enrollments_student_id_fkey'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'enrollments_term_id_fkey'; columns: ['term_id']; isOneToOne: false; referencedRelation: 'terms'; referencedColumns: ['id'] }];
			};
			messages: {
				Row: { body: string; conversation_id: string; created_at: string; id: string; read_at: string | null; sender_id: string };
				Insert: { body: string; conversation_id: string; created_at?: string; id?: string; read_at?: string | null; sender_id: string };
				Update: { body?: string; conversation_id?: string; created_at?: string; id?: string; read_at?: string | null; sender_id?: string };
				Relationships: [{ foreignKeyName: 'messages_conversation_id_fkey'; columns: ['conversation_id']; isOneToOne: false; referencedRelation: 'conversations'; referencedColumns: ['id'] }, { foreignKeyName: 'messages_sender_id_fkey'; columns: ['sender_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			profile_contacts: {
				Row: { email: string | null; facebook: string | null; instagram: string | null; line_id: string | null; phone: string | null; updated_at: string; user_id: string };
				Insert: { email?: string | null; facebook?: string | null; instagram?: string | null; line_id?: string | null; phone?: string | null; updated_at?: string; user_id: string };
				Update: { email?: string | null; facebook?: string | null; instagram?: string | null; line_id?: string | null; phone?: string | null; updated_at?: string; user_id?: string };
				Relationships: [{ foreignKeyName: 'profile_contacts_user_id_fkey'; columns: ['user_id']; isOneToOne: true; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			profiles: {
				Row: { avatar_url: string | null; bio: string | null; created_at: string; education_level: Database["public"]["Enums"]["education_level"] | null; first_name: string; id: string; last_name: string; nickname: string; role: Database["public"]["Enums"]["app_role"]; school: string | null; updated_at: string };
				Insert: { avatar_url?: string | null; bio?: string | null; created_at?: string; education_level?: Database["public"]["Enums"]["education_level"] | null; first_name?: string; id: string; last_name?: string; nickname?: string; role?: Database["public"]["Enums"]["app_role"]; school?: string | null; updated_at?: string };
				Update: { avatar_url?: string | null; bio?: string | null; created_at?: string; education_level?: Database["public"]["Enums"]["education_level"] | null; first_name?: string; id?: string; last_name?: string; nickname?: string; role?: Database["public"]["Enums"]["app_role"]; school?: string | null; updated_at?: string };
				Relationships: [];
			};
			subject_tutors: {
				Row: { added_at: string; subject_id: string; tutor_id: string };
				Insert: { added_at?: string; subject_id: string; tutor_id: string };
				Update: { added_at?: string; subject_id?: string; tutor_id?: string };
				Relationships: [{ foreignKeyName: 'subject_tutors_subject_id_fkey'; columns: ['subject_id']; isOneToOne: false; referencedRelation: 'subjects'; referencedColumns: ['id'] }, { foreignKeyName: 'subject_tutors_tutor_id_fkey'; columns: ['tutor_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			subjects: {
				Row: { code: string | null; cover_url: string | null; created_at: string; created_by: string | null; description: string | null; id: string; is_published: boolean; title: string; title_th: string | null; updated_at: string };
				Insert: { code?: string | null; cover_url?: string | null; created_at?: string; created_by?: string | null; description?: string | null; id?: string; is_published?: boolean; title: string; title_th?: string | null; updated_at?: string };
				Update: { code?: string | null; cover_url?: string | null; created_at?: string; created_by?: string | null; description?: string | null; id?: string; is_published?: boolean; title?: string; title_th?: string | null; updated_at?: string };
				Relationships: [{ foreignKeyName: 'subjects_created_by_fkey'; columns: ['created_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			terms: {
				Row: { capacity: number | null; created_at: string; description: string | null; end_date: string | null; id: string; is_published: boolean; name: string; price: number; schedule_note: string | null; start_date: string | null; subject_id: string; updated_at: string };
				Insert: { capacity?: number | null; created_at?: string; description?: string | null; end_date?: string | null; id?: string; is_published?: boolean; name: string; price?: number; schedule_note?: string | null; start_date?: string | null; subject_id: string; updated_at?: string };
				Update: { capacity?: number | null; created_at?: string; description?: string | null; end_date?: string | null; id?: string; is_published?: boolean; name?: string; price?: number; schedule_note?: string | null; start_date?: string | null; subject_id?: string; updated_at?: string };
				Relationships: [{ foreignKeyName: 'terms_subject_id_fkey'; columns: ['subject_id']; isOneToOne: false; referencedRelation: 'subjects'; referencedColumns: ['id'] }];
			};
			feed_posts: {
				Row: { author_id: string | null; body: string; comment_count: number; created_at: string; edited_at: string | null; id: string; is_pinned: boolean; like_count: number; term_id: string };
				Insert: { author_id?: string | null; body?: string; comment_count?: number; created_at?: string; edited_at?: string | null; id?: string; is_pinned?: boolean; like_count?: number; term_id: string };
				Update: { author_id?: string | null; body?: string; comment_count?: number; created_at?: string; edited_at?: string | null; id?: string; is_pinned?: boolean; like_count?: number; term_id?: string };
				Relationships: [{ foreignKeyName: 'feed_posts_author_id_fkey'; columns: ['author_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'feed_posts_term_id_fkey'; columns: ['term_id']; isOneToOne: false; referencedRelation: 'terms'; referencedColumns: ['id'] }];
			};
			feed_post_media: {
				Row: { height: number | null; id: string; kind: 'image' | 'video'; mime_type: string | null; position: number; post_id: string; size_bytes: number | null; storage_path: string; width: number | null };
				Insert: { height?: number | null; id?: string; kind: 'image' | 'video'; mime_type?: string | null; position?: number; post_id: string; size_bytes?: number | null; storage_path: string; width?: number | null };
				Update: { height?: number | null; id?: string; kind?: 'image' | 'video'; mime_type?: string | null; position?: number; post_id?: string; size_bytes?: number | null; storage_path?: string; width?: number | null };
				Relationships: [{ foreignKeyName: 'feed_post_media_post_id_fkey'; columns: ['post_id']; isOneToOne: false; referencedRelation: 'feed_posts'; referencedColumns: ['id'] }];
			};
			feed_post_likes: {
				Row: { created_at: string; post_id: string; user_id: string };
				Insert: { created_at?: string; post_id: string; user_id: string };
				Update: { created_at?: string; post_id?: string; user_id?: string };
				Relationships: [{ foreignKeyName: 'feed_post_likes_post_id_fkey'; columns: ['post_id']; isOneToOne: false; referencedRelation: 'feed_posts'; referencedColumns: ['id'] }, { foreignKeyName: 'feed_post_likes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			feed_comments: {
				Row: { body: string; created_at: string; edited_at: string | null; id: string; like_count: number; parent_id: string | null; post_id: string; reply_to_user_id: string | null; user_id: string };
				Insert: { body: string; created_at?: string; edited_at?: string | null; id?: string; like_count?: number; parent_id?: string | null; post_id: string; reply_to_user_id?: string | null; user_id: string };
				Update: { body?: string; created_at?: string; edited_at?: string | null; id?: string; like_count?: number; parent_id?: string | null; post_id?: string; reply_to_user_id?: string | null; user_id?: string };
				Relationships: [{ foreignKeyName: 'feed_comments_parent_id_fkey'; columns: ['parent_id']; isOneToOne: false; referencedRelation: 'feed_comments'; referencedColumns: ['id'] }, { foreignKeyName: 'feed_comments_post_id_fkey'; columns: ['post_id']; isOneToOne: false; referencedRelation: 'feed_posts'; referencedColumns: ['id'] }, { foreignKeyName: 'feed_comments_reply_to_user_id_fkey'; columns: ['reply_to_user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'feed_comments_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			feed_comment_likes: {
				Row: { comment_id: string; created_at: string; user_id: string };
				Insert: { comment_id: string; created_at?: string; user_id: string };
				Update: { comment_id?: string; created_at?: string; user_id?: string };
				Relationships: [{ foreignKeyName: 'feed_comment_likes_comment_id_fkey'; columns: ['comment_id']; isOneToOne: false; referencedRelation: 'feed_comments'; referencedColumns: ['id'] }, { foreignKeyName: 'feed_comment_likes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
			video_progress: {
				Row: { completed_at: string | null; content_id: string; duration_seconds: number; last_position: number; updated_at: string; user_id: string; watched: unknown; watched_seconds: number };
				Insert: { completed_at?: string | null; content_id: string; duration_seconds?: number; last_position?: number; updated_at?: string; user_id: string; watched?: unknown; watched_seconds?: number };
				Update: { completed_at?: string | null; content_id?: string; duration_seconds?: number; last_position?: number; updated_at?: string; user_id?: string; watched?: unknown; watched_seconds?: number };
				Relationships: [{ foreignKeyName: 'video_progress_content_id_fkey'; columns: ['content_id']; isOneToOne: false; referencedRelation: 'contents'; referencedColumns: ['id'] }, { foreignKeyName: 'video_progress_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
			};
		};
		Views: { [_ in never]: never };
		Functions: {
			can_access_term: { Args: { p_term_id: string }; Returns: boolean };
			check_in: {
				Args: { p_session_id: string; p_token: string; p_latitude?: number; p_longitude?: number; p_accuracy?: number };
				Returns: { status: string; message: string; distance_m: number | null; checked_in_at: string | null }[];
			};
			current_app_role: { Args: never; Returns: Database['public']['Enums']['app_role'] };
			get_checkin_token: {
				Args: { p_session_id: string };
				Returns: { token: string; expires_at: string; rotate_seconds: number }[];
			};
			is_admin: { Args: never; Returns: boolean };
			is_term_staff: { Args: { p_term_id: string }; Returns: boolean };
			is_term_student: { Args: { p_term_id: string }; Returns: boolean };
			mark_announcement_read: { Args: { p_announcement_id: string }; Returns: undefined };
			mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
			record_content_view: { Args: { p_content_id: string }; Returns: undefined };
			record_video_progress: {
				Args: { p_content_id: string; p_from: number; p_to: number; p_position: number; p_duration: number };
				Returns: { watched_seconds: number; duration_seconds: number; completed: boolean }[];
			};
			start_conversation: { Args: { p_other_id: string }; Returns: string };
			term_content_report: {
				Args: { p_term_id: string };
				Returns: {
					content_id: string; student_id: string; viewed_at: string | null; view_count: number;
					watched_seconds: number; duration_seconds: number; completed: boolean;
				}[];
			};
			term_seat_counts: {
				Args: { p_term_ids: string[] };
				Returns: { term_id: string; approved: number; pending: number }[];
			};
			unread_message_count: { Args: never; Returns: number };
		};
		Enums: {
			app_role: 'admin' | 'tutor' | 'student';
			content_type: 'video' | 'text' | 'image' | 'file' | 'link';
			education_level: 'high_school' | 'university';
			enrollment_status: 'pending' | 'approved' | 'rejected';
		};
		CompositeTypes: { [_ in never]: never };
	};
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
