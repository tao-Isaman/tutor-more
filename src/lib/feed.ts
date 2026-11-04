import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './database.types.ts';
import { PROFILE_LITE, type ProfileLite } from './utils.ts';

export const FEED_PAGE_SIZE = 10;
const SIGNED_URL_TTL = 60 * 60 * 3; // 3 hours

export type FeedMedia = Tables<'feed_post_media'> & { url: string | null };
export type FeedComment = Tables<'feed_comments'> & {
	author: ProfileLite | null;
	reply_to: ProfileLite | null;
	liked: boolean;
};
export type FeedPost = Tables<'feed_posts'> & {
	author: ProfileLite | null;
	media: FeedMedia[];
	liked: boolean;
	comments: FeedComment[];
};

export const COMMENT_SELECT = `*, author:profiles!feed_comments_user_id_fkey(${PROFILE_LITE}), reply_to:profiles!feed_comments_reply_to_user_id_fkey(${PROFILE_LITE})`;

type Client = SupabaseClient<Database>;

/** Load one page of posts (pinned first, newest first) with media, likes and comments. */
export async function loadFeedPage(supabase: Client, termId: string, userId: string, offset = 0) {
	const { data: rows, error } = await supabase
		.from('feed_posts')
		.select(`*, author:profiles!feed_posts_author_id_fkey(${PROFILE_LITE}), media:feed_post_media(*)`)
		.eq('term_id', termId)
		.order('is_pinned', { ascending: false })
		.order('created_at', { ascending: false })
		.range(offset, offset + FEED_PAGE_SIZE - 1);
	if (error) throw error;

	const posts = rows ?? [];
	const ids = posts.map((p) => p.id);
	if (!ids.length) return { posts: [] as FeedPost[], hasMore: false };

	const paths = posts.flatMap((p) => p.media.map((m) => m.storage_path));
	const [likes, comments, signed] = await Promise.all([
		supabase.from('feed_post_likes').select('post_id').eq('user_id', userId).in('post_id', ids),
		supabase.from('feed_comments').select(COMMENT_SELECT).in('post_id', ids).order('created_at'),
		paths.length
			? supabase.storage.from('course-media').createSignedUrls(paths, SIGNED_URL_TTL)
			: Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] })
	]);

	const commentRows = (comments.data ?? []) as unknown as Omit<FeedComment, 'liked'>[];
	const commentIds = commentRows.map((c) => c.id);
	const commentLikes = commentIds.length
		? (await supabase.from('feed_comment_likes').select('comment_id').eq('user_id', userId).in('comment_id', commentIds)).data ?? []
		: [];

	const likedPosts = new Set((likes.data ?? []).map((l) => l.post_id));
	const likedComments = new Set(commentLikes.map((l) => l.comment_id));
	const urlByPath = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));

	const feed: FeedPost[] = posts.map((p) => ({
		...p,
		author: p.author as ProfileLite | null,
		media: [...p.media].sort((a, b) => a.position - b.position).map((m) => ({ ...m, url: urlByPath.get(m.storage_path) ?? null })),
		liked: likedPosts.has(p.id),
		comments: commentRows.filter((c) => c.post_id === p.id).map((c) => ({ ...c, liked: likedComments.has(c.id) }))
	}));

	return { posts: feed, hasMore: posts.length === FEED_PAGE_SIZE };
}

/** Fetch one comment with its authors (used for realtime inserts). */
export async function loadComment(supabase: Client, id: string): Promise<FeedComment | null> {
	const { data } = await supabase.from('feed_comments').select(COMMENT_SELECT).eq('id', id).maybeSingle();
	return data ? ({ ...(data as unknown as Omit<FeedComment, 'liked'>), liked: false }) : null;
}
