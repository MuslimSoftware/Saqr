import React from 'react'
import { IconButton, IconButtonProps } from './IconButton'

// Extend IconButtonProps, omitting things we set internally (like variant)
// Keep label and icon optionality from IconButtonProps
type SecondaryButtonProps = Omit<IconButtonProps, 'variant'>

export const SecondaryButton = (props: SecondaryButtonProps) => {
  // Pass all props down to IconButton, setting the variant to 'secondary'
  return <IconButton variant="secondary" {...props} />
}
