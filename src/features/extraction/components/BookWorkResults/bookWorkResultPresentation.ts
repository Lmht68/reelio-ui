import type { Book, BookEdition, BookMention } from '../../types'

export function formatAuthorCredits(names: ReadonlyArray<string>): string {
  return names.join(', ')
}

export function formatBookWorkIdentity(title: string, authorNames: ReadonlyArray<string>): string {
  const formattedAuthorCredits = formatAuthorCredits(authorNames)

  return formattedAuthorCredits.length > 0 ? `${title} by ${formattedAuthorCredits}` : title
}

export function formatBookMention(mention: BookMention): string {
  return formatBookWorkIdentity(mention.title, mention.authors)
}

export function formatPreferredBookEditionSummary(edition: BookEdition | null): string {
  if (edition === null) {
    return 'Unavailable'
  }

  if (edition.title !== null && edition.publication_year !== null) {
    return `${edition.title} · ${edition.publication_year}`
  }

  if (edition.title !== null) {
    return edition.title
  }

  if (edition.publication_year !== null) {
    return `Publication year ${edition.publication_year}`
  }

  return edition.open_library_edition_id
}

function areAuthorCreditsEqual(
  mentionAuthorNames: ReadonlyArray<string>,
  providerAuthorNames: ReadonlyArray<string>,
): boolean {
  return (
    mentionAuthorNames.length === providerAuthorNames.length &&
    mentionAuthorNames.every((authorName, index) => authorName === providerAuthorNames[index])
  )
}

export function isBookMentionDifferent(mention: BookMention, book: Book): boolean {
  return (
    mention.title !== book.title ||
    !areAuthorCreditsEqual(
      mention.authors,
      book.authors.map(({ name }) => name),
    )
  )
}
