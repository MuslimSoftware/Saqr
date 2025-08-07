import { TextAliasProps } from './ThemedText'

import { ThemedText } from './ThemedText'

export * from './ThemedText'

// Export the aliases
export * from './TextLink'

export const TextHeader = (props: TextAliasProps) => (
  <ThemedText variant="h1" {...props} />
)

export const TextHeaderTwo = (props: TextAliasProps) => (
  <ThemedText variant="h2" {...props} />
)

export const TextHeaderThree = (props: TextAliasProps) => (
  <ThemedText variant="h3" {...props} />
)

export const TextHeaderFour = (props: TextAliasProps) => (
  <ThemedText variant="h4" {...props} />
)

export const TextBody = (props: TextAliasProps) => (
  <ThemedText variant="body1" {...props} />
)

export const TextSubtitle = (props: TextAliasProps) => (
  <ThemedText variant="body2" {...props} />
)

export const TextCaption = (props: TextAliasProps) => (
  <ThemedText variant="caption" {...props} />
)

export const TextButtonLabel = (props: TextAliasProps) => (
  <ThemedText variant="button" {...props} />
)
