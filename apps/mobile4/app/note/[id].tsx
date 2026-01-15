import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listInboxCaptures, updateInboxCaptureText, type InboxCapture } from '@/src/storage/inbox'
import { InsightIcon } from '@/src/components/InsightIcon'
import { extractTags, extractPeople, extractPlaces, wordCount, formatRelativeDate } from '@insight/shared'

export default function NoteDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>()
  const noteId = Array.isArray(idParam) ? idParam[0] : idParam
  const { palette } = useTheme()

  const [capture, setCapture] = useState<InboxCapture | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    if (!noteId) {
      setCapture(null)
      setText('')
      return
    }
    let mounted = true
    listInboxCaptures().then((rows) => {
      if (!mounted) return
      const found = rows.find((row) => row.id === noteId) ?? null
      setCapture(found)
      setText(found?.rawText ?? '')
    })
    return () => {
      mounted = false
    }
  }, [noteId])

  useEffect(() => {
    if (!capture) return
    const handle = setTimeout(() => {
      if (text !== capture.rawText) {
        void updateInboxCaptureText(capture.id, text)
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [capture, text])

  const tags = useMemo(() => extractTags(text), [text])
  const people = useMemo(() => extractPeople(text), [text])
  const places = useMemo(() => extractPlaces(text), [text])
  const words = useMemo(() => wordCount(text), [text])

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Note</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.metaCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={{ color: palette.textSecondary }}>
            {capture ? formatRelativeDate(capture.createdAt) : noteId ? 'Loading...' : 'Note not found'}
          </Text>
          <Text style={{ color: palette.textSecondary }}>{words} words</Text>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          placeholder="Start writing..."
          placeholderTextColor={palette.textSecondary}
          style={[styles.editor, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
        />

        <View style={styles.tokenRow}>
          <Text style={[styles.tokenLabel, { color: palette.textSecondary }]}>Tags</Text>
          <Text style={{ color: palette.text }}>{tags.length ? tags.join(' ') : '—'}</Text>
        </View>
        <View style={styles.tokenRow}>
          <Text style={[styles.tokenLabel, { color: palette.textSecondary }]}>People</Text>
          <Text style={{ color: palette.text }}>{people.length ? people.join(' ') : '—'}</Text>
        </View>
        <View style={styles.tokenRow}>
          <Text style={[styles.tokenLabel, { color: palette.textSecondary }]}>Places</Text>
          <Text style={{ color: palette.text }}>{places.length ? places.join(' ') : '—'}</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', fontFamily: 'Figtree' },
  backButton: { padding: 8 },
  content: { padding: 16, gap: 12 },
  metaCard: { padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  editor: { minHeight: 220, borderWidth: 1, borderRadius: 16, padding: 12, fontFamily: 'Figtree' },
  tokenRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tokenLabel: { fontWeight: '700' },
})
