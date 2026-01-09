import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/Themed'
import { useTheme } from '@/src/state/theme'
import { listTasks, updateTask, type MobileTask } from '@/src/storage/tasks'
import { InsightIcon } from '@/src/components/InsightIcon'

export default function TaskDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { palette } = useTheme()

  const [task, setTask] = useState<MobileTask | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let mounted = true
    listTasks().then((rows) => {
      if (!mounted) return
      const found = rows.find((row) => row.id === id) ?? null
      setTask(found)
      setTitle(found?.title ?? '')
      setNotes(found?.notes ?? '')
    })
    return () => {
      mounted = false
    }
  }, [id])

  useEffect(() => {
    if (!task) return
    const handle = setTimeout(() => {
      if (title !== task.title || notes !== task.notes) {
        void updateTask(task.id, { title: title.trim() || task.title, notes })
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [task, title, notes])

  const toggleDone = async () => {
    if (!task) return
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    await updateTask(task.id, { status: nextStatus, completedAt: nextStatus === 'done' ? Date.now() : null })
    setTask((prev) => (prev ? { ...prev, status: nextStatus } : prev))
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Task</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          placeholderTextColor={palette.textSecondary}
          style={[styles.titleInput, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
        />

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes"
          placeholderTextColor={palette.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.notesInput, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
        />

        <TouchableOpacity style={[styles.doneButton, { backgroundColor: palette.tint }]} onPress={toggleDone}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            {task?.status === 'done' ? 'Mark as Todo' : 'Mark Done'}
          </Text>
        </TouchableOpacity>
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
  titleInput: { borderWidth: 1, borderRadius: 16, padding: 12, fontFamily: 'Figtree' },
  notesInput: { borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 160, fontFamily: 'Figtree' },
  doneButton: { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
