import type { Book, BookMention } from '../../types'

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
