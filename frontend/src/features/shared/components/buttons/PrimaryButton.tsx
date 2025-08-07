import React from 'react'
import { IconButton, IconButtonProps } from './IconButton'

// Extend IconButtonProps, omitting things we set internally (like variant)
// Keep label and icon optionality from IconButtonProps
type PrimaryButtonProps = Omit<IconButtonProps, 'variant'>

export const PrimaryButton = (props: PrimaryButtonProps) => {
  // Pass all props down to IconButton, setting the variant to 'primary'
  return <IconButton variant="primary" {...props} />
}
