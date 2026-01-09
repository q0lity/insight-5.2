function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function makeEntityId() {
  return makeId('ent')
}

export function makeNoteId() {
  return makeId('note')
}

export function makeTaskId() {
  return makeId('tsk')
}

export function makeEventId() {
  return makeId('evt')
}

export function makeWorkoutId() {
  return makeId('wkt')
}

export function makeMealId() {
  return makeId('meal')
}

export function makeFoodItemId() {
  return makeId('food')
}

export function makeExerciseId() {
  return makeId('exr')
}

export function makePatternId() {
  return makeId('pat')
}
