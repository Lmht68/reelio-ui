export function formatAuthorCredits(names: ReadonlyArray<string>): string {
  return names.join(', ')
}

export function formatBookWorkIdentity(title: string, authorNames: ReadonlyArray<string>): string {
  const formattedAuthorCredits = formatAuthorCredits(authorNames)

  return formattedAuthorCredits.length > 0 ? `${title} by ${formattedAuthorCredits}` : title
}

