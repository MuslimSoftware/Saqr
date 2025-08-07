import React from 'react'
import { gaps } from '@/features/shared/theme/spacing'
import { BaseColumn, BaseColumnProps } from './BaseColumn'
import { ViewProps } from 'react-native'

export const LargeColumn: React.FC<ViewProps> = ({
  children,
  ...props
}) => {

  return (
    <BaseColumn gap={gaps.large} {...props}>
      {children}
    </BaseColumn>
  )
}
