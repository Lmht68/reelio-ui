export function formatArtistNames(names: ReadonlyArray<string>): string {
  return names.join(', ')
}

export function getAvailableMusicText(value: string): string | null {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

