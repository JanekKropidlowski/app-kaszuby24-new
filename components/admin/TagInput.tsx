import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { findOrCreateTags } from '@/services/adminApi';

export interface Tag {
  id: number;
  name: string;
}

interface Props {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagInput({ tags, onChange }: Props) {
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const addTag = async () => {
    const name = input.trim();
    if (!name) return;
    if (tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
      setInput('');
      return;
    }
    setLoading(true);
    try {
      const res = await findOrCreateTags([name]);
      const newTag = res.data?.[0];
      if (newTag) {
        onChange([...tags, newTag]);
      }
    } catch {
      // offline fallback: add with id=-1, will resolve on save
      onChange([...tags, { id: -1, name }]);
    } finally {
      setInput('');
      setLoading(false);
    }
  };

  const removeTag = (id: number, name: string) => {
    onChange(tags.filter(t => !(t.id === id && t.name === name)));
  };

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {tags.map(tag => (
          <View key={`${tag.id}-${tag.name}`} style={[styles.chip, { backgroundColor: c.primary + '18', borderColor: c.primary + '40' }]}>
            <Text style={[styles.chipText, { color: c.primary, fontFamily: 'Poppins_Medium' }]}>
              {tag.name}
            </Text>
            <TouchableOpacity onPress={() => removeTag(tag.id, tag.name)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <X size={12} color={c.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.subtle }]}>
        <TextInput
          style={[styles.input, { color: c.text, fontFamily: 'Poppins_Regular' }]}
          placeholder="Dodaj tag..."
          placeholderTextColor={c.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTag}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: c.primary, opacity: loading || !input.trim() ? 0.5 : 1 }]}
          onPress={addTag}
          disabled={loading || !input.trim()}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Plus size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { fontSize: 13 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingLeft: 12, overflow: 'hidden',
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 14 },
  addBtn: { padding: 10, paddingHorizontal: 14 },
});
