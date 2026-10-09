import { useSyncExternalStore } from 'react'
import { getConsent, onConsentChange } from './analytics'

export const useConsent = () => useSyncExternalStore(onConsentChange, getConsent)
