# Regenerates src/lib/database.types.ts from the schema spec below. Run from the repo root:
#   python3 scripts/gen_types.py
# (Equivalent to `supabase gen types typescript`; add new tables to T when migrations add them.)
# Builds src/lib/database.types.ts from a compact schema spec (mirrors `supabase gen types`).
import json
T = {
 "announcement_reads": ({"announcement_id":"string","read_at":"string","user_id":"string"}, {"read_at"}, [("announcement_id","announcements"),("user_id","profiles")]),
 "announcements": ({"author_id":"string | null","body":"string","created_at":"string","id":"string","is_pinned":"boolean","term_id":"string","title":"string"}, {"author_id","created_at","id","is_pinned"}, [("author_id","profiles"),("term_id","terms")]),
 "attendance_records": ({"accuracy_m":"number | null","checked_in_at":"string","distance_m":"number | null","latitude":"number | null","longitude":"number | null","marked_by":"string | null","method":"string","session_id":"string","student_id":"string"}, {"accuracy_m","checked_in_at","distance_m","latitude","longitude","marked_by","method"}, [("marked_by","profiles"),("session_id","attendance_sessions"),("student_id","profiles")]),
 "attendance_sessions": ({"ended_at":"string | null","id":"string","is_open":"boolean","latitude":"number | null","longitude":"number | null","radius_m":"number","require_location":"boolean","rotate_seconds":"number","started_at":"string","started_by":"string | null","term_id":"string","title":"string"}, {"ended_at","id","is_open","latitude","longitude","radius_m","require_location","rotate_seconds","started_at","started_by"}, [("started_by","profiles"),("term_id","terms")]),
 "comments": ({"body":"string","content_id":"string","created_at":"string","id":"string","is_resolved":"boolean","parent_id":"string | null","user_id":"string"}, {"created_at","id","is_resolved","parent_id"}, [("content_id","contents"),("parent_id","comments"),("user_id","profiles")]),
 "content_views": ({"content_id":"string","first_viewed_at":"string","last_viewed_at":"string","user_id":"string","view_count":"number"}, {"first_viewed_at","last_viewed_at","view_count"}, [("content_id","contents"),("user_id","profiles")]),
 "contents": ({"body":"string | null","created_at":"string","created_by":"string | null","duration_seconds":"number | null","external_url":"string | null","file_name":"string | null","id":"string","is_published":"boolean","mime_type":"string | null","position":"number","section":"string | null","size_bytes":"number | null","storage_path":"string | null","term_id":"string","title":"string","type":'Database["public"]["Enums"]["content_type"]',"updated_at":"string"}, {"body","created_at","created_by","duration_seconds","external_url","file_name","id","is_published","mime_type","position","section","size_bytes","storage_path","updated_at"}, [("created_by","profiles"),("term_id","terms")]),
 "conversations": ({"created_at":"string","id":"string","last_message_at":"string","last_message_preview":"string | null","student_id":"string","tutor_id":"string"}, {"created_at","id","last_message_at","last_message_preview"}, [("student_id","profiles"),("tutor_id","profiles")]),
 "enrollments": ({"decided_at":"string | null","decided_by":"string | null","id":"string","message":"string | null","requested_at":"string","status":'Database["public"]["Enums"]["enrollment_status"]',"student_id":"string","term_id":"string"}, {"decided_at","decided_by","id","message","requested_at","status"}, [("decided_by","profiles"),("student_id","profiles"),("term_id","terms")]),
 "messages": ({"body":"string","conversation_id":"string","created_at":"string","id":"string","read_at":"string | null","sender_id":"string"}, {"created_at","id","read_at"}, [("conversation_id","conversations"),("sender_id","profiles")]),
 "profile_contacts": ({"email":"string | null","facebook":"string | null","instagram":"string | null","line_id":"string | null","phone":"string | null","updated_at":"string","user_id":"string"}, {"email","facebook","instagram","line_id","phone","updated_at"}, [("user_id","profiles",True)]),
 "profiles": ({"avatar_url":"string | null","bio":"string | null","created_at":"string","education_level":'Database["public"]["Enums"]["education_level"] | null',"first_name":"string","id":"string","last_name":"string","nickname":"string","role":'Database["public"]["Enums"]["app_role"]',"school":"string | null","updated_at":"string"}, {"avatar_url","bio","created_at","education_level","first_name","last_name","nickname","role","school","updated_at"}, []),
 "subject_tutors": ({"added_at":"string","subject_id":"string","tutor_id":"string"}, {"added_at"}, [("subject_id","subjects"),("tutor_id","profiles")]),
 "subjects": ({"code":"string | null","cover_url":"string | null","created_at":"string","created_by":"string | null","description":"string | null","id":"string","is_published":"boolean","title":"string","title_th":"string | null","updated_at":"string"}, {"code","cover_url","created_at","created_by","description","id","is_published","title_th","updated_at"}, [("created_by","profiles")]),
 "terms": ({"capacity":"number | null","created_at":"string","description":"string | null","end_date":"string | null","id":"string","is_published":"boolean","name":"string","price":"number","schedule_note":"string | null","start_date":"string | null","subject_id":"string","updated_at":"string"}, {"capacity","created_at","description","end_date","id","is_published","price","schedule_note","start_date","updated_at"}, [("subject_id","subjects")]),
 "feed_posts": ({"author_id":"string | null","body":"string","comment_count":"number","created_at":"string","edited_at":"string | null","id":"string","is_pinned":"boolean","like_count":"number","term_id":"string"}, {"author_id","body","comment_count","created_at","edited_at","id","is_pinned","like_count"}, [("author_id","profiles"),("term_id","terms")]),
 "feed_post_media": ({"height":"number | null","id":"string","kind":"'image' | 'video'","mime_type":"string | null","position":"number","post_id":"string","size_bytes":"number | null","storage_path":"string","width":"number | null"}, {"height","id","mime_type","position","size_bytes","width"}, [("post_id","feed_posts")]),
 "feed_post_likes": ({"created_at":"string","post_id":"string","user_id":"string"}, {"created_at"}, [("post_id","feed_posts"),("user_id","profiles")]),
 "feed_comments": ({"body":"string","created_at":"string","edited_at":"string | null","id":"string","like_count":"number","parent_id":"string | null","post_id":"string","reply_to_user_id":"string | null","user_id":"string"}, {"created_at","edited_at","id","like_count","parent_id","reply_to_user_id"}, [("parent_id","feed_comments"),("post_id","feed_posts"),("reply_to_user_id","profiles"),("user_id","profiles")]),
 "feed_comment_likes": ({"comment_id":"string","created_at":"string","user_id":"string"}, {"created_at"}, [("comment_id","feed_comments"),("user_id","profiles")]),
 "video_progress": ({"completed_at":"string | null","content_id":"string","duration_seconds":"number","last_position":"number","updated_at":"string","user_id":"string","watched":"unknown","watched_seconds":"number"}, {"completed_at","duration_seconds","last_position","updated_at","watched","watched_seconds"}, [("content_id","contents"),("user_id","profiles")]),
}
out = ["// Generated from the Supabase schema (equivalent to `supabase gen types typescript`).",
"// Regenerate with: npx supabase gen types typescript --project-id abrhdxxalkqjvrbzetty > src/lib/database.types.ts","",
"export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];","",
"export type Database = {","\t__InternalSupabase: { PostgrestVersion: '14.18' };","\tpublic: {","\t\tTables: {"]
for name,(cols,opt,rels) in T.items():
    out.append(f"\t\t\t{name}: {{")
    out.append("\t\t\t\tRow: { " + "; ".join(f"{k}: {v}" for k,v in cols.items()) + " };")
    out.append("\t\t\t\tInsert: { " + "; ".join(f"{k}{'?' if k in opt else ''}: {v}" for k,v in cols.items()) + " };")
    out.append("\t\t\t\tUpdate: { " + "; ".join(f"{k}?: {v}" for k,v in cols.items()) + " };")
    rl=[]
    for r in rels:
        col,ref=r[0],r[1]; one = len(r)>2
        rl.append(f"{{ foreignKeyName: '{name}_{col}_fkey'; columns: ['{col}']; isOneToOne: {'true' if one else 'false'}; referencedRelation: '{ref}'; referencedColumns: ['id'] }}")
    out.append("\t\t\t\tRelationships: [" + ", ".join(rl) + "];")
    out.append("\t\t\t};")
out.append("\t\t};")
out.append("""		Views: { [_ in never]: never };
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
""")
open('src/lib/database.types.ts','w').write("\n".join(out))
