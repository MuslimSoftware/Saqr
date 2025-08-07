import React from 'react'
import { PrimaryButton } from '@/features/shared/components/buttons'
import { AppleButton } from '@/features/shared/components/buttons'
import { GoogleButton } from '@/features/shared/components/buttons'
import { SmallColumn } from '@/features/shared/components/layout'

interface SocialButtonsProps {
  navigateToEmail: () => void
}

export function SocialButtons({ navigateToEmail }: SocialButtonsProps) {
  return (
    <SmallColumn>
      <PrimaryButton label="Continue with Email" onPress={navigateToEmail} />
      <GoogleButton onPress={navigateToEmail} />
      <AppleButton onPress={navigateToEmail} />
    </SmallColumn>
  )
}
