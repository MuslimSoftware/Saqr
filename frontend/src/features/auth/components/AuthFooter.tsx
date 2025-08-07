import React from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native'
import { TextSubtitle, TextCaption, TextLink } from '@/features/shared/components/text'
import { MediumRow, SmallRow } from '@/features/shared/components/layout'

export function AuthFooter({
  navigateToEmail,
}: {
  navigateToEmail: () => void
}) {
  return (
    <View style={styles.container}>
      <MediumRow style={styles.row}>
        <TextSubtitle>Already have an account?</TextSubtitle>
        <TouchableOpacity onPress={navigateToEmail}>
          <TextLink variant="body2">Sign in</TextLink>
        </TouchableOpacity>
      </MediumRow>

      <SmallRow style={styles.termsContainer}>
        <TextCaption>By continuing, you agree to our</TextCaption>
        <TouchableOpacity>
          <TextLink>Terms of Service</TextLink>
        </TouchableOpacity>
        <TextCaption> and</TextCaption>
        <TouchableOpacity>
          <TextLink>Privacy Policy</TextLink>
        </TouchableOpacity>
      </SmallRow>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingBottom: 10,
  },
  row: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsContainer: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
})
