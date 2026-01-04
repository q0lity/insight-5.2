import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import {
  createHabit,
  getHabit,
  updateHabit,
  type HabitPolarity,
  type CharacterStat,
} from '@/src/storage/habits';

const PRESET_COLORS = [
  '#D95D39', // Orange (default)
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F97316', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EAB308', // Yellow
  '#64748B', // Slate
];

const POLARITY_OPTIONS: { value: HabitPolarity; label: string; description: string }[] = [
  { value: 'positive', label: 'Positive Only', description: 'Track good habits with +' },
  { value: 'negative', label: 'Negative Only', description: 'Track bad habits with -' },
  { value: 'both', label: 'Both', description: 'Track with + and -' },
];

const CATEGORY_SHORTCUTS = ['Work', 'Health', 'Personal', 'Learning', 'Transport', 'Finance'];

const CHARACTER_STATS: { value: CharacterStat; label: string; color: string }[] = [
  { value: 'STR', label: 'STR', color: '#EF4444' },
  { value: 'INT', label: 'INT', color: '#3B82F6' },
  { value: 'CON', label: 'CON', color: '#22C55E' },
  { value: 'PER', label: 'PER', color: '#A855F7' },
];

// Helper to parse comma-separated strings into arrays
function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Helper to join array into comma-separated string
function joinWithCommas(arr: string[]): string {
  return arr.join(', ');
}

export default function HabitFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const isEditing = !!id;

  // Basic fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [difficulty, setDifficulty] = useState(5);
  const [importance, setImportance] = useState(5);
  const [polarity, setPolarity] = useState<HabitPolarity>('positive');
  const [targetPerWeek, setTargetPerWeek] = useState<string>('');
  const [color, setColor] = useState('#D95D39');
  const [isTimed, setIsTimed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Extended frontmatter fields
  const [tagsInput, setTagsInput] = useState('');
  const [peopleInput, setPeopleInput] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');
  const [location, setLocation] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [character, setCharacter] = useState<CharacterStat[]>([]);
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('');

  useEffect(() => {
    if (id) {
      getHabit(id).then((habit) => {
        if (habit) {
          setName(habit.name);
          setCategory(habit.category ?? '');
          setSubcategory(habit.subcategory ?? '');
          setDifficulty(habit.difficulty);
          setImportance(habit.importance);
          setPolarity(habit.polarity);
          setTargetPerWeek(habit.targetPerWeek?.toString() ?? '');
          setColor(habit.color);
          setIsTimed(habit.isTimed);
          // Extended fields
          setTagsInput(joinWithCommas(habit.tags ?? []));
          setPeopleInput(joinWithCommas(habit.people ?? []));
          setEstimateMinutes(habit.estimateMinutes?.toString() ?? '');
          setLocation(habit.location ?? '');
          setSkillsInput(joinWithCommas(habit.skills ?? []));
          setCharacter(habit.character ?? []);
          setGoal(habit.goal ?? '');
          setProject(habit.project ?? '');
        }
      });
    }
  }, [id]);

  const handleCategoryShortcut = (shortcut: string) => {
    setCategory(shortcut);
  };

  const toggleCharacterStat = (stat: CharacterStat) => {
    setCharacter((prev) =>
      prev.includes(stat) ? prev.filter((s) => s !== stat) : [...prev, stat]
    );
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a habit name.');
      return;
    }

    setLoading(true);
    try {
      const habitData = {
        name: name.trim(),
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
        difficulty,
        importance,
        polarity,
        targetPerWeek: targetPerWeek ? parseInt(targetPerWeek, 10) : null,
        color,
        isTimed,
        // Extended fields
        tags: parseCommaSeparated(tagsInput),
        people: parseCommaSeparated(peopleInput),
        estimateMinutes: estimateMinutes ? parseInt(estimateMinutes, 10) : null,
        location: location.trim() || null,
        skills: parseCommaSeparated(skillsInput),
        character,
        goal: goal.trim() || null,
        project: project.trim() || null,
      };

      if (isEditing && id) {
        await updateHabit(id, habitData);
      } else {
        await createHabit(habitData);
      }

      router.back();
    } catch (error) {
      console.error('Failed to save habit:', error);
      Alert.alert('Error', 'Failed to save habit. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    name,
    category,
    subcategory,
    difficulty,
    importance,
    polarity,
    targetPerWeek,
    color,
    isTimed,
    tagsInput,
    peopleInput,
    estimateMinutes,
    location,
    skillsInput,
    character,
    goal,
    project,
    isEditing,
    id,
    router,
  ]);

  // Numbered Button Row Component (1-10)
  const NumberedButtonRow = ({
    value,
    onChange,
    label,
    lowLabel,
    highLabel,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
    lowLabel: string;
    highLabel: string;
  }) => (
    <View style={styles.inputGroup}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: palette.tint }]}>{value}</Text>
      </View>
      <View style={styles.numberedButtonRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <Pressable
            key={num}
            onPress={() => onChange(num)}
            style={[
              styles.numberedButton,
              {
                backgroundColor:
                  value === num
                    ? palette.tint
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.04)',
                borderColor:
                  value === num
                    ? palette.tint
                    : isDark
                      ? 'rgba(148,163,184,0.16)'
                      : 'rgba(28,28,30,0.08)',
              },
            ]}>
            <Text
              style={[
                styles.numberedButtonText,
                { color: value === num ? '#FFFFFF' : palette.tabIconDefault },
              ]}>
              {num}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderLabel, { color: palette.textSecondary }]}>{lowLabel}</Text>
        <Text style={[styles.sliderLabel, { color: palette.textSecondary }]}>{highLabel}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            {isEditing ? 'Edit Habit' : 'New Habit'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
            <Text style={[styles.saveButtonText, { color: palette.tint }]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Name</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: palette.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                },
              ]}
              placeholder="e.g., Morning Run"
              placeholderTextColor={palette.textSecondary}
              value={name}
              onChangeText={setName}
              autoFocus={!isEditing}
            />
          </View>

          {/* Category Shortcuts */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Quick Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryShortcuts}>
              {CATEGORY_SHORTCUTS.map((shortcut) => (
                <Pressable
                  key={shortcut}
                  onPress={() => handleCategoryShortcut(shortcut)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        category === shortcut
                          ? palette.tint
                          : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
                      borderColor:
                        category === shortcut
                          ? palette.tint
                          : isDark
                            ? 'rgba(148,163,184,0.16)'
                            : 'rgba(28,28,30,0.08)',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: category === shortcut ? '#FFFFFF' : palette.text },
                    ]}>
                    {shortcut}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Category & Subcategory */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: palette.text }]}>Category</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                  },
                ]}
                placeholder="e.g., Health"
                placeholderTextColor={palette.textSecondary}
                value={category}
                onChangeText={setCategory}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: palette.text }]}>Subcategory</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                  },
                ]}
                placeholder="e.g., Exercise"
                placeholderTextColor={palette.textSecondary}
                value={subcategory}
                onChangeText={setSubcategory}
              />
            </View>
          </View>

          {/* Section Divider - Frontmatter */}
          <View style={styles.sectionDivider}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.08)' }]} />
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Details</Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.08)' }]} />
          </View>

          {/* Tags Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Tags</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: palette.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                },
              ]}
              placeholder="e.g., morning, routine, cardio"
              placeholderTextColor={palette.textSecondary}
              value={tagsInput}
              onChangeText={setTagsInput}
            />
            <Text style={[styles.helperText, { color: palette.textSecondary }]}>
              Comma-separated, applied to every log
            </Text>
          </View>

          {/* People Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>People</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: palette.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                },
              ]}
              placeholder="e.g., @trainer, @workout-buddy"
              placeholderTextColor={palette.textSecondary}
              value={peopleInput}
              onChangeText={setPeopleInput}
            />
          </View>

          {/* Estimate & Location Row */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: palette.text }]}>Estimate (min)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                  },
                ]}
                placeholder="e.g., 30"
                placeholderTextColor={palette.textSecondary}
                value={estimateMinutes}
                onChangeText={setEstimateMinutes}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: palette.text }]}>Location</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                  },
                ]}
                placeholder="e.g., Gym"
                placeholderTextColor={palette.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Skills Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Skills</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: palette.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                },
              ]}
              placeholder="e.g., endurance, discipline"
              placeholderTextColor={palette.textSecondary}
              value={skillsInput}
              onChangeText={setSkillsInput}
            />
          </View>

          {/* Character Stats */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Character Stats</Text>
            <View style={styles.characterChips}>
              {CHARACTER_STATS.map((stat) => (
                <Pressable
                  key={stat.value}
                  onPress={() => toggleCharacterStat(stat.value)}
                  style={[
                    styles.characterChip,
                    {
                      backgroundColor: character.includes(stat.value)
                        ? stat.color
                        : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.04)',
                      borderColor: character.includes(stat.value)
                        ? stat.color
                        : isDark
                          ? 'rgba(148,163,184,0.16)'
                          : 'rgba(28,28,30,0.08)',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.characterChipText,
                      { color: character.includes(stat.value) ? '#FFFFFF' : palette.text },
                    ]}>
                    {stat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.helperText, { color: palette.textSecondary }]}>
              Which stats does this habit build?
            </Text>
          </View>

          {/* Goal & Project Row */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: palette.text }]}>Goal</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                  },
                ]}
                placeholder="e.g., Get Fit"
                placeholderTextColor={palette.textSecondary}
                value={goal}
                onChangeText={setGoal}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: palette.text }]}>Project</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                  },
                ]}
                placeholder="e.g., Q1 Fitness"
                placeholderTextColor={palette.textSecondary}
                value={project}
                onChangeText={setProject}
              />
            </View>
          </View>

          {/* Section Divider - Scoring */}
          <View style={styles.sectionDivider}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.08)' }]} />
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Scoring</Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.08)' }]} />
          </View>

          {/* Importance Button Grid */}
          <NumberedButtonRow
            value={importance}
            onChange={setImportance}
            label="Importance"
            lowLabel="Low"
            highLabel="High"
          />

          {/* Difficulty Button Grid */}
          <NumberedButtonRow
            value={difficulty}
            onChange={setDifficulty}
            label="Difficulty / Energy"
            lowLabel="Easy"
            highLabel="Hard"
          />

          {/* Section Divider - Habit Settings */}
          <View style={styles.sectionDivider}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.08)' }]} />
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Habit Settings</Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.08)' }]} />
          </View>

          {/* Polarity Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Tracking Type</Text>
            <View style={styles.polarityOptions}>
              {POLARITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setPolarity(option.value)}
                  style={[
                    styles.polarityOption,
                    {
                      backgroundColor:
                        polarity === option.value
                          ? palette.tintLight
                          : isDark
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.02)',
                      borderColor:
                        polarity === option.value
                          ? palette.tint
                          : palette.border,
                    },
                  ]}>
                  <View style={styles.polarityContent}>
                    <Text
                      style={[
                        styles.polarityLabel,
                        { color: polarity === option.value ? palette.tint : palette.text },
                      ]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.polarityDesc, { color: palette.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {polarity === option.value && (
                    <InsightIcon name="checkCircle" size={20} color={palette.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Timed Toggle */}
          <Pressable
            onPress={() => setIsTimed(!isTimed)}
            style={[
              styles.toggleRow,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
              },
            ]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>Timed Habit</Text>
              <Text style={[styles.toggleDesc, { color: palette.textSecondary }]}>
                Show "Start" button to track duration
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: isTimed ? palette.tint : isDark ? 'rgba(148,163,184,0.3)' : 'rgba(28,28,30,0.2)',
                },
              ]}>
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: isTimed ? 18 : 2 }] },
                ]}
              />
            </View>
          </Pressable>

          {/* Target Per Week */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Target Per Week (optional)</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: palette.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                },
              ]}
              placeholder="e.g., 5"
              placeholderTextColor={palette.textSecondary}
              value={targetPerWeek}
              onChangeText={setTargetPerWeek}
              keyboardType="number-pad"
            />
          </View>

          {/* Color Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Color</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((presetColor) => (
                <Pressable
                  key={presetColor}
                  onPress={() => setColor(presetColor)}
                  style={[
                    styles.colorOption,
                    { backgroundColor: presetColor },
                    color === presetColor && styles.colorOptionSelected,
                  ]}>
                  {color === presetColor && <InsightIcon name="checkCircle" size={20} color="#FFFFFF" />}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Points Preview */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: palette.tintLight,
                borderColor: palette.tint + '33',
              },
            ]}>
            <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>
              Points per completion
            </Text>
            <Text style={[styles.previewValue, { color: palette.tint }]}>
              {Math.round((importance / 10) * (difficulty / 10) * 10)} XP
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  helperText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Figtree',
    marginTop: -4,
  },
  textInput: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Figtree',
    borderWidth: 1,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  // Category shortcuts
  categoryShortcuts: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  // Section divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Character chips
  characterChips: {
    flexDirection: 'row',
    gap: 10,
  },
  characterChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 60,
    alignItems: 'center',
  },
  characterChipText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  // Numbered button row
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  numberedButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  numberedButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  numberedButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Polarity
  polarityOptions: {
    gap: 10,
  },
  polarityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  polarityContent: {
    gap: 2,
  },
  polarityLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  polarityDesc: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  toggleDesc: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  // Color picker
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  // Preview
  previewCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewValue: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
});
