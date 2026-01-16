import { Bullet } from "src"

export function updateBulletType(original: string, newType: Bullet): string {
  if (!isBulletText(original)) {
    // raise error
    throw new Error('The provided text is not a valid bullet point.')
  }

  return original.replace(/- \[.\]/, `- [${newType.character}]`)
}

export function isBulletText(text: string): boolean {
  // trimmed text starts with - [
  const trimmed = text.trimStart()
  return trimmed.startsWith('- [')
}