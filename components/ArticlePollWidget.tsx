import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/store/themeStore';

const PANEL = 'https://panel.kaszuby24.pl';
const VOTER_KEY = 'k24-voter-id';

type PollOption = { id: string; label: string };
type Poll = {
  id: number;
  postId: number;
  question: string;
  options: PollOption[];
  counts: Record<string, number>;
  total: number;
  hasVoted: boolean;
  votedOptionId: string | null;
};

async function getVoterId(): Promise<string> {
  try {
    let v = await AsyncStorage.getItem(VOTER_KEY);
    if (!v || v.length < 16) {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      v = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
      await AsyncStorage.setItem(VOTER_KEY, v);
    }
    return v;
  } catch {
    return '';
  }
}

export default function ArticlePollWidget({ postId }: { postId: number }) {
  const theme = useThemeStore((s) => s.theme);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voted, setVoted] = useState(false);
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const voter = await getVoterId();
      try {
        const res = await fetch(`${PANEL}/wp-json/kaszuby24/v1/poll/${postId}`, {
          headers: { 'X-K24-Voter': voter },
        });
        if (!res.ok) return;
        const data: Poll | null = await res.json();
        if (!cancelled && data?.question) {
          setPoll(data);
          if (data.hasVoted) setVoted(true);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [postId]);

  const submit = useCallback(async () => {
    if (!poll || !selected || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const voter = await getVoterId();
      const res = await fetch(`${PANEL}/wp-json/kaszuby24/v1/poll/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-K24-Voter': voter,
          'Origin': 'https://kaszuby24.pl',
        },
        body: JSON.stringify({ optionId: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Błąd wysyłania głosu.');
        return;
      }
      const data = await res.json();
      setPoll((p) => p ? ({
        ...p,
        counts: data.counts || {},
        total: data.total || 0,
        hasVoted: true,
        votedOptionId: data.votedOptionId || selected,
      }) : p);
      setVoted(true);
    } catch {
      setError('Brak połączenia z siecią.');
    } finally {
      setSubmitting(false);
    }
  }, [poll, selected, submitting, postId]);

  if (!poll) return null;

  const c = theme.colors;
  const isDark = theme.isDarkMode;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: c.border }]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: c.primary }]} />
        <Text style={[styles.label, { color: c.primary, fontFamily: theme.fontFamily.bold }]}>
          ANKIETA
        </Text>
      </View>

      <Text style={[styles.question, { color: c.text, fontFamily: theme.fontFamily.semibold }]}>
        {poll.question}
      </Text>

      {voted ? (
        <View style={styles.results}>
          {poll.options.map((opt) => {
            const n = poll.counts[opt.id] || 0;
            const pct = poll.total > 0 ? Math.round((n / poll.total) * 100) : 0;
            const mine = poll.votedOptionId === opt.id;
            return (
              <View key={opt.id} style={styles.resultRow}>
                <View style={styles.resultMeta}>
                  <Text style={[
                    styles.resultLabel,
                    { color: mine ? c.primary : c.text, fontFamily: mine ? theme.fontFamily.semibold : theme.fontFamily.regular },
                  ]}>
                    {opt.label}
                    {mine ? '  ✓' : ''}
                  </Text>
                  <Text style={[styles.pct, { color: c.textSecondary, fontFamily: theme.fontFamily.medium }]}>
                    {pct}%
                  </Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: c.border }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pct}%`, backgroundColor: mine ? c.primary : c.textSecondary },
                    ]}
                  />
                </View>
              </View>
            );
          })}
          <Text style={[styles.total, { color: c.textSecondary, fontFamily: theme.fontFamily.regular }]}>
            {poll.total} {poll.total === 1 ? 'głos' : poll.total < 5 ? 'głosy' : 'głosów'}
          </Text>
        </View>
      ) : (
        <View style={styles.options}>
          {poll.options.map((opt) => {
            const active = selected === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSelected(opt.id)}
                activeOpacity={0.8}
                style={[
                  styles.option,
                  {
                    borderColor: active ? c.primary : c.border,
                    backgroundColor: active ? (isDark ? 'rgba(74,123,200,0.15)' : 'rgba(34,74,150,0.06)') : (isDark ? '#334155' : '#ffffff'),
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? c.primary : c.border }]}>
                  {active && <View style={[styles.radioFill, { backgroundColor: c.primary }]} />}
                </View>
                <Text style={[styles.optionText, { color: c.text, fontFamily: theme.fontFamily.regular }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={submit}
              disabled={!selected || submitting}
              activeOpacity={0.85}
              style={[
                styles.voteBtn,
                { backgroundColor: selected && !submitting ? c.primary : c.border },
              ]}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.voteBtnText, { fontFamily: theme.fontFamily.semibold }]}>Zagłosuj</Text>
              }
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={[styles.error, { fontFamily: theme.fontFamily.regular }]}>{error}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  question: {
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 16,
  },
  options: {},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    marginTop: 4,
  },
  voteBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  voteBtnText: {
    color: '#fff',
    fontSize: 13,
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: '#ef4444',
  },
  results: {
    gap: 10,
  },
  resultRow: {
    gap: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  pct: {
    fontSize: 12,
    marginLeft: 8,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  total: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
});
