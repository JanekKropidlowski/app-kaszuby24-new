import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { X, Check, Search } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getCategories } from '@/services/adminApi';

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  count?: number;
}

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export default function CategoryPicker({ selectedIds, onChange }: Props) {
  const { theme } = useThemeStore();
  const c = theme.colors;

  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open && categories.length === 0) {
      setLoading(true);
      getCategories()
        .then(res => setCategories(res.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(i => i !== id)
        : [...selectedIds, id]
    );
  };

  const filtered = search
    ? categories.filter(cat => cat.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  // Separate root and child categories
  const roots = filtered.filter(c => !c.parent_id);
  const childrenOf = (parentId: number) => filtered.filter(c => c.parent_id === parentId);

  const selectedNames = categories
    .filter(cat => selectedIds.includes(cat.id))
    .map(cat => cat.name);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.subtle }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.triggerText, { color: selectedNames.length ? c.text : c.textSecondary, fontFamily: 'Poppins_Regular' }]} numberOfLines={2}>
          {selectedNames.length ? selectedNames.join(', ') : 'Wybierz kategorie...'}
        </Text>
        {selectedIds.length > 0 && (
          <View style={[styles.badge, { backgroundColor: c.primary }]}>
            <Text style={styles.badgeText}>{selectedIds.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text, fontFamily: 'Poppins_SemiBold' }]}>
              Kategorie
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <X size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchRow, { borderColor: c.border, backgroundColor: c.subtle }]}>
            <Search size={15} color={c.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: c.text, fontFamily: 'Poppins_Regular' }]}
              placeholder="Szukaj..."
              placeholderTextColor={c.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: 32 }} />
          ) : (
            <ScrollView>
              {roots.map(root => (
                <React.Fragment key={root.id}>
                  <CategoryRow
                    category={root}
                    selected={selectedIds.includes(root.id)}
                    onToggle={toggle}
                    indent={0}
                    theme={theme}
                  />
                  {childrenOf(root.id).map(child => (
                    <CategoryRow
                      key={child.id}
                      category={child}
                      selected={selectedIds.includes(child.id)}
                      onToggle={toggle}
                      indent={1}
                      theme={theme}
                    />
                  ))}
                </React.Fragment>
              ))}
            </ScrollView>
          )}

          <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: c.primary }]}
              onPress={() => setOpen(false)}
            >
              <Text style={[styles.doneBtnText, { fontFamily: 'Poppins_SemiBold' }]}>
                Gotowe ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CategoryRow({ category, selected, onToggle, indent, theme }: {
  category: Category; selected: boolean;
  onToggle: (id: number) => void; indent: number; theme: any;
}) {
  const c = theme.colors;
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: c.border, paddingLeft: 16 + indent * 20 }]}
      onPress={() => onToggle(category.id)}
    >
      <View style={[styles.checkbox, { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : 'transparent' }]}>
        {selected && <Check size={12} color="#fff" strokeWidth={3} />}
      </View>
      <Text style={[styles.rowText, { color: c.text, fontFamily: indent ? 'Poppins_Regular' : 'Poppins_Medium' }]}>
        {category.name}
      </Text>
      {category.count != null && (
        <Text style={[styles.rowCount, { color: c.textSecondary, fontFamily: 'Poppins_Regular' }]}>
          {category.count}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, gap: 8,
  },
  triggerText: { flex: 1, fontSize: 14 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins_SemiBold' },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingRight: 16, paddingVertical: 13, borderBottomWidth: 1,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1, fontSize: 14 },
  rowCount: { fontSize: 12 },
  modalFooter: {
    padding: 16, borderTopWidth: 1,
  },
  doneBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16 },
});
