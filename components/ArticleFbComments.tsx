import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';

const PANEL_API = 'https://panel.kaszuby24.pl/api/news/fb-comments';

const BADWORDS = ['kurwa','chuj','jebać','pierdolić','cipa','dupa','cwel','fiut'];

function censor(text: string): string {
  let out = text;
  for (const w of BADWORDS) {
    out = out.replace(new RegExp(w, 'gi'), (m) => m[0] + '*'.repeat(m.length - 1));
  }
  return out;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pl-PL', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
}

type FbReply = {
  from_name?: string;
  from_id?: string;
  message?: string;
  created_time?: string;
  like_count?: number;
};
type FbComment = FbReply & { replies?: FbReply[] };
type FbData = { fb_post_id?: string; comments?: FbComment[]; count?: number };

const INITIAL_SHOW = 5;

function Avatar({ fromId, name, size }: { fromId?: string; name: string; size: number }) {
  const [err, setErr] = useState(false);
  const initials = name.trim().split(' ').map((p) => p[0]?.toUpperCase() || '').slice(0, 2).join('');

  if (fromId && !err) {
    return (
      <Image
        source={{ uri: `https://graph.facebook.com/${fromId}/picture?type=normal` }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials || '?'}</Text>
    </View>
  );
}

function CommentItem({ c, isReply, theme }: { c: FbComment; isReply?: boolean; theme: any }) {
  const colors = theme.colors;
  const isDark = theme.isDarkMode;
  const name = c.from_name || 'Użytkownik';
  const msg = censor(c.message || '');
  const time = formatTime(c.created_time);
  const avatarSize = isReply ? 26 : 32;

  return (
    <View style={[styles.commentRow, isReply && styles.replyRow]}>
      <Avatar fromId={c.from_id} name={name} size={avatarSize} />
      <View style={styles.commentBody}>
        <View style={[
          styles.bubble,
          { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
        ]}>
          <Text style={[styles.commentName, { color: colors.primary, fontFamily: theme.fontFamily.semibold }]}>
            {name}
          </Text>
          <Text style={[styles.commentText, { color: colors.text, fontFamily: theme.fontFamily.regular }]}>
            {msg}
          </Text>
        </View>
        <View style={styles.commentMeta}>
          {time ? (
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
              {time}
            </Text>
          ) : null}
          {(c.like_count ?? 0) > 0 && (
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
              👍 {c.like_count}
            </Text>
          )}
        </View>

        {!isReply && c.replies && c.replies.length > 0 && (
          <View style={[styles.replies, { borderLeftColor: colors.border }]}>
            {c.replies.map((r, i) => (
              <CommentItem key={i} c={r} isReply theme={theme} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default function ArticleFbComments({ postId }: { postId: number }) {
  const theme = useThemeStore((s) => s.theme);
  const [data, setData] = useState<FbData | null | 'loading'>('loading');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${PANEL_API}/${postId}`)
      .then((r) => r.json())
      .then((d: FbData) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ comments: [], count: 0 }); });
    return () => { cancelled = true; };
  }, [postId]);

  const c = theme.colors;
  const isDark = theme.isDarkMode;

  if (data === 'loading') {
    return (
      <View style={[styles.container, { borderTopColor: c.border }]}>
        <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 20 }} />
      </View>
    );
  }

  const comments = data?.comments || [];
  if (!comments.length) return null;

  const totalCount = data?.count ?? comments.length;
  const fbUrl = data?.fb_post_id ? `https://www.facebook.com/${data.fb_post_id}` : null;
  const visible = showAll ? comments : comments.slice(0, INITIAL_SHOW);
  const hidden = comments.length - INITIAL_SHOW;

  return (
    <View style={[styles.container, { borderTopColor: c.border }]}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerDot, { backgroundColor: c.primary }]} />
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fontFamily.semibold }]}>
            Komentarze
            <Text style={[styles.countBadge, { color: c.textSecondary }]}>  ({totalCount})</Text>
          </Text>
          <View style={[styles.fbBadge, { borderColor: c.border }]}>
            <Text style={[styles.fbBadgeText, { color: c.textSecondary }]}>f</Text>
          </View>
        </View>
        {fbUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(fbUrl)} activeOpacity={0.7}>
            <Text style={[styles.seePost, { color: c.textSecondary, fontFamily: theme.fontFamily.regular }]}>
              Zobacz post →
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments list */}
      <View style={styles.list}>
        {visible.map((comment, i) => (
          <CommentItem key={i} c={comment} theme={theme} />
        ))}
      </View>

      {/* Show more */}
      {!showAll && hidden > 0 && (
        <TouchableOpacity
          onPress={() => setShowAll(true)}
          activeOpacity={0.8}
          style={[styles.showMore, { backgroundColor: isDark ? '#334155' : '#f1f5f9', borderColor: c.border }]}
        >
          <Text style={[styles.showMoreText, { color: c.textSecondary, fontFamily: theme.fontFamily.medium }]}>
            Pokaż więcej ({hidden})
          </Text>
        </TouchableOpacity>
      )}

      {/* CTA */}
      {fbUrl && (
        <TouchableOpacity
          onPress={() => Linking.openURL(fbUrl)}
          activeOpacity={0.85}
          style={[styles.cta, { backgroundColor: c.primary }]}
        >
          <Text style={[styles.ctaText, { fontFamily: theme.fontFamily.semibold }]}>
            Skomentuj na Facebooku
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 15,
  },
  countBadge: {
    fontSize: 13,
    fontWeight: 'normal',
  },
  fbBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  fbBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1877F2',
  },
  seePost: {
    fontSize: 12,
  },
  list: {
    gap: 12,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  replyRow: {
    marginTop: 8,
  },
  avatar: {
    resizeMode: 'cover',
  },
  avatarFallback: {
    backgroundColor: '#224A96',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  commentBody: {
    flex: 1,
  },
  bubble: {
    borderRadius: 12,
    borderTopLeftRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentName: {
    fontSize: 12,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 19,
  },
  commentMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
    paddingLeft: 4,
  },
  metaText: {
    fontSize: 11,
  },
  replies: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    gap: 6,
  },
  showMore: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 13,
  },
  cta: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
  },
});
