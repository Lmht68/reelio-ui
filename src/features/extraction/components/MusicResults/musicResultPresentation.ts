import type {
  MusicRelease,
  MusicReleaseMention,
  Track,
  TrackMention,
} from '../../types'

export function formatArtistNames(names: ReadonlyArray<string>): string {
  return names.join(', ')
}

export function getAvailableMusicText(value: string): string | null {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

export function formatTrackMention(mention: TrackMention): string {
  const artistNames = formatArtistNames(mention.artists)
  let formattedMention = mention.track_title

  if (artistNames.length > 0) {
    formattedMention += ` by ${artistNames}`
  }

  if (mention.release_title !== null && mention.release_year !== null) {
    formattedMention += ` · ${mention.release_title} (${mention.release_year})`
  } else if (mention.release_title !== null) {
    formattedMention += ` · ${mention.release_title}`
  } else if (mention.release_year !== null) {
    formattedMention += ` · Release year ${mention.release_year}`
  }

  return formattedMention
}

export function formatMusicReleaseMention(mention: MusicReleaseMention): string {
  const artistNames = formatArtistNames(mention.artists)
  let formattedMention = mention.release_title

  if (artistNames.length > 0) {
    formattedMention += ` by ${artistNames}`
  }

  if (mention.release_year !== null) {
    formattedMention += ` (${mention.release_year})`
  }

  return formattedMention
}

function areArtistNamesEqual(
  mentionArtistNames: ReadonlyArray<string>,
  providerArtistNames: ReadonlyArray<string>,
): boolean {
  return (
    mentionArtistNames.length === providerArtistNames.length &&
    mentionArtistNames.every((artistName, index) => artistName === providerArtistNames[index])
  )
}

export function isTrackMentionDifferent(mention: TrackMention, track: Track): boolean {
  const providerArtistNames = track.artists.map(({ name }) => name)

  return (
    mention.track_title !== track.track_title ||
    !areArtistNamesEqual(mention.artists, providerArtistNames) ||
    (mention.release_title !== null &&
      mention.release_title !== track.preferred_music_release.release_title)
  )
}

export function isMusicReleaseMentionDifferent(
  mention: MusicReleaseMention,
  musicRelease: MusicRelease,
): boolean {
  const providerArtistNames = musicRelease.artists.map(({ name }) => name)

  return (
    mention.release_title !== musicRelease.release_title ||
    !areArtistNamesEqual(mention.artists, providerArtistNames)
  )
}
