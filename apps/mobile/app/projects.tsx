import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listProjects, addProject, deleteProject, type Project } from '@/src/storage/projects';

export default function ProjectsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await listProjects();
    setProjects(data.sort((a, b) => b.createdAt - a.createdAt));
  }

  async function handleAddProject() {
    if (!newProjectName.trim()) return;
    await addProject(newProjectName.trim());
    setNewProjectName('');
    await loadData();
  }

  async function handleDeleteProject(id: string) {
    await deleteProject(id);
    await loadData();
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Projects</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
              color: palette.text,
              borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)'
            }
          ]}
          placeholder="Enter a new project..."
          placeholderTextColor={palette.tabIconDefault}
          value={newProjectName}
          onChangeText={setNewProjectName}
          onSubmitEditing={handleAddProject}
        />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: palette.tint }]} 
          onPress={handleAddProject}
        >
          <InsightIcon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' }]}>
            <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>
              No active projects yet. Group your tasks into projects to stay organized.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.projectItem, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' }]}>
            <View style={styles.projectInfo}>
              <Text style={[styles.projectName, { color: palette.text }]}>{item.name}</Text>
              <Text style={[styles.projectDate, { color: palette.tabIconDefault }]}>
                Created {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteProject(item.id)} style={styles.deleteButton}>
              <InsightIcon name="plus" size={18} color={isDark ? 'rgba(148,163,184,0.4)' : 'rgba(28,28,30,0.3)'} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Figtree',
    borderWidth: 1,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Figtree',
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  deleteButton: {
    padding: 8,
    transform: [{ rotate: '45deg' }],
  },
});
