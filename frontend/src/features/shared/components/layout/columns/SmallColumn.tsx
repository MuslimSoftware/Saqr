import React from 'react'
import { ViewProps } from 'react-native'
import { gaps } from '@/features/shared/theme/spacing'
import { BaseColumn, BaseColumnProps } from './BaseColumn'

// Rename component to SmallColumn
export const SmallColumn: React.FC<ViewProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <BaseColumn gap={gaps.small} style={style} {...props}>
      {children}
    </BaseColumn>
  )
} 