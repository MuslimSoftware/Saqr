import React from 'react'
import { BaseColumn } from './BaseColumn'
import { gaps } from '@/features/shared/theme'
import { ViewProps } from 'react-native'

// Rename the component to MediumColumn
export const MediumColumn: React.FC<ViewProps> = ({
  children,
  ...props
}) => {

  return (
    <BaseColumn gap={gaps.medium} {...props}>
      {children}
    </BaseColumn>
  )
} 