import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import {
  getInboxCapture,
  updateCaptureText,
  updateCaptureStatus,
  deleteInboxCapture,
} from '@/src/storage/inbox';
import type { InboxCapture, InboxCaptureStatus } from '@/src/storage/inbox';
import {
  firstLine,
  extractTags,
  extractPeople,
  extractPlaces,
  wordCount,
} from '@/src/lib/notes';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [capture, setCapture] = useState<InboxCapture | null>(null);
  const [editorText, setEditorText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      const result = await getInboxCapture(id);
      if (!mounted) return;
      setCapture(result);
      setEditorText(result?.rawText ?? '');
      setDirty(false);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [id, isFocused]);

  const handleSave = useCallback(async () => {
    if (!capture || !dirty) return;
    setSaving(true);
    await updateCaptureText(capture.id, editorText);
    setCapture((prev) => (prev ? { ...prev, rawText: editorText } : prev));
    setDirty(false);
    setSaving(false);
  }, [capture, dirty, editorText]);

  const handleStatusChange = useCallback(
    async (status: InboxCaptureStatus) => {
      if (!capture) return;
      await updateCaptureStatus(capture.id, status);
      setCapture((prev) => (prev ? { ...prev, status } : prev));
    },
    [capture],
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await deleteInboxCapture(id);
            router.back();
          },
        },
      ],
    );
  };

  if (!capture) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Note</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  const title = firstLine(capture.rawText) || 'New Note';
  const tags = extractTags(capture.rawText);
  const people = extractPeople(capture.rawText);
  const places = extractPlaces(capture.rawText);
  const words = wordCount(editorText);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backButton}>
          <Ionicons name="trash-outline" size={22} color={palette.danger ?? '#ef4444'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.metaCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Created</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {new Date(capture.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Words</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>{words}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Status</Text>
            <View style={styles.statusButtons}>
              {(['raw', 'processed', 'archived'] as InboxCaptureStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusButton,
                    {
                      backgroundColor: capture.status === s ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() => handleStatusChange(s)}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      { color: capture.status === s ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {(tags.length > 0 || people.length > 0 || places.length > 0) && (
          <View style={[styles.entitiesCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {tags.length > 0 && (
              <View style={styles.entitySection}>
                <Text style={[styles.entityLabel, { color: palette.textSecondary }]}>Tags</Text>
                <View style={styles.entityChips}>
                  {tags.map((tag) => (
                    <View key={tag} style={[styles.entityChip, { backgroundColor: palette.border }]}>
                      <Text style={[styles.entityChipText, { color: palette.text }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {people.length > 0 && (
              <View style={styles.entitySection}>
                <Text style={[styles.entityLabel, { color: palette.textSecondary }]}>People</Text>
                <View style={styles.entityChips}>
                  {people.map((person) => (
                    <View key={person} style={[styles.entityChip, { backgroundColor: palette.border }]}>
                      <Text style={[styles.entityChipText, { color: palette.text }]}>{person}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {places.length > 0 && (
              <View style={styles.entitySection}>
                <Text style={[styles.entityLabel, { color: palette.textSecondary }]}>Places</Text>
                <View style={styles.entityChips}>
                  {places.map((place) => (
                    <View key={place} style={[styles.entityChip, { backgroundColor: palette.border }]}>
                      <Text style={[styles.entityChipText, { color: palette.text }]}>{place}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={[styles.editorCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TextInput
            style={[styles.editor, { color: palette.text }]}
            value={editorText}
            onChangeText={(text) => {
              setEditorText(text);
              setDirty(true);
            }}
            placeholder="Write your note here..."
            placeholderTextColor={palette.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.editorActions}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: dirty ? palette.tint : palette.border },
            ]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            <Text style={[styles.saveButtonText, { color: dirty ? '#FFFFFF' : palette.textSecondary }]}>
              {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entitiesCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  entitySection: {
    gap: 6,
  },
  entityLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  entityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  entityChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  entityChipText: {
    fontSize: 12,
  },
  editorCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 200,
  },
  editor: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 180,
  },
  editorActions: {
    alignItems: 'center',
  },
  saveButton: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
