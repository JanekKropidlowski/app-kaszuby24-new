// Ekran konfiguracji widgetu Android (otwiera się przy dodaniu / long-press → konfiguruj).
// User wybiera Powiat + Dział (artykuły) lub Powiat (wydarzenia). Zapis per widgetId.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestWidgetUpdateById,
  type WidgetConfigurationScreenProps,
} from 'react-native-android-widget';
import { WK, androidCfgKey, type WidgetDicts, type ArticlesConfig } from '../lib/widget-shared';
import { fetchArticlesForWidget, fetchEventsForWidget } from '../lib/widget-data';
import { renderByName } from './android';

const BRAND = '#224A96';

type Choice = { id: number | null; name: string };
const ALL: Choice = { id: null, name: 'Wszystkie' };

export function WidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const isEvents = widgetInfo.widgetName === 'Wydarzenia';
  const [dicts, setDicts] = useState<WidgetDicts | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [dzialId, setDzialId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawDicts, rawCfg] = await Promise.all([
          AsyncStorage.getItem(WK.dicts),
          AsyncStorage.getItem(androidCfgKey(widgetInfo.widgetId)),
        ]);
        if (rawDicts) setDicts(JSON.parse(rawDicts) as WidgetDicts);
        if (rawCfg) {
          const cfg = JSON.parse(rawCfg) as ArticlesConfig;
          setRegionId(cfg.regionId);
          setDzialId(cfg.dzialId);
        }
      } catch {
        /* brak słowników — pokaż tylko "Wszystkie" */
      }
    })();
  }, [widgetInfo.widgetId]);

  const save = useCallback(async () => {
    setSaving(true);
    const cfg: ArticlesConfig = { regionId, dzialId: isEvents ? null : dzialId, sort: 'date' };
    try {
      await AsyncStorage.setItem(androidCfgKey(widgetInfo.widgetId), JSON.stringify(cfg));
      // Pobierz świeże dane wg wyboru i namaluj widget od razu.
      if (isEvents) {
        const events = await fetchEventsForWidget(cfg.regionId).catch(() => []);
        renderWidget(renderByName('Wydarzenia', { weather: null, air: null, waste: null, posts: [], events }));
      } else {
        const posts = await fetchArticlesForWidget(cfg).catch(() => []);
        renderWidget(renderByName('Artykuly', { weather: null, air: null, waste: null, posts, events: [] }));
        await requestWidgetUpdateById({
          widgetName: 'Artykuly',
          widgetId: widgetInfo.widgetId,
          renderWidget: () => renderByName('Artykuly', { weather: null, air: null, waste: null, posts, events: [] }),
          widgetNotFound: () => {},
        }).catch(() => {});
      }
    } catch {
      /* zapis best-effort */
    } finally {
      setResult('ok');
    }
  }, [regionId, dzialId, isEvents, renderWidget, setResult, widgetInfo.widgetId]);

  const regions: Choice[] = [ALL, ...(dicts?.regions ?? [])];
  const dzialy: Choice[] = [ALL, ...(dicts?.dzialy ?? [])];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>{isEvents ? 'Wydarzenia — widget' : 'Artykuły — widget'}</Text>
      <Text style={styles.h2}>Powiat</Text>
      <View style={styles.pills}>
        {regions.map((r) => (
          <Pill key={String(r.id)} label={r.name} active={regionId === r.id} onPress={() => setRegionId(r.id)} />
        ))}
      </View>

      {!isEvents ? (
        <>
          <Text style={styles.h2}>Dział</Text>
          <View style={styles.pills}>
            {dzialy.map((d) => (
              <Pill key={String(d.id)} label={d.name} active={dzialId === d.id} onPress={() => setDzialId(d.id)} />
            ))}
          </View>
        </>
      ) : null}

      <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Zapisz widget</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  h2: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  pillActive: { backgroundColor: BRAND, borderColor: BRAND },
  pillTxt: { fontSize: 13, color: '#1E293B' },
  pillTxtActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { marginTop: 28, backgroundColor: BRAND, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
