import { dark } from '@clerk/themes'
import type { Appearance } from '@clerk/types'

// Get the current theme from DOM or default to light
const getCurrentTheme = () => {
  if (typeof window === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

// NGI Capital design system colors
const colors = {
  light: {
    primary: '#0EA5E9', // Sky blue
    primaryForeground: '#FFFFFF',
    background: '#FFFFFF',
    foreground: '#0A0A0A',
    card: '#FFFFFF',
    cardForeground: '#0A0A0A',
    muted: '#F5F5F5',
    mutedForeground: '#737373',
    border: '#E5E5E5',
    input: '#E5E5E5',
    destructive: '#EF4444',
    success: '#10B981',
  },
  dark: {
    primary: '#0EA5E9',
    primaryForeground: '#FFFFFF',
    background: '#0A0A0A',
    foreground: '#FAFAFA',
    card: '#1C1C1C',
    cardForeground: '#FAFAFA',
    muted: '#262626',
    mutedForeground: '#A3A3A3',
    border: '#262626',
    input: '#262626',
    destructive: '#DC2626',
    success: '#10B981',
  }
}

export const getClerkAppearance = (theme?: 'light' | 'dark'): Appearance => {
  const currentTheme = theme || getCurrentTheme()
  const isDark = currentTheme === 'dark'
  const themeColors = isDark ? colors.dark : colors.light

  return {
    baseTheme: isDark ? dark : undefined,
    layout: {
      socialButtonsPlacement: 'bottom',
      socialButtonsVariant: 'blockButton',
      termsPageUrl: '/terms',
      privacyPageUrl: '/privacy',
    },
    variables: {
      colorPrimary: themeColors.primary,
      colorDanger: themeColors.destructive,
      colorSuccess: themeColors.success,
      colorBackground: themeColors.background,
      colorText: themeColors.foreground,
      colorTextOnPrimaryBackground: themeColors.primaryForeground,
      colorTextSecondary: themeColors.mutedForeground,
      colorInputBackground: themeColors.card,
      colorInputText: themeColors.foreground,
      borderRadius: '0.75rem',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      fontSize: '14px',
      spacingUnit: '4px',
    },
    elements: {
      // Root and cards
      rootBox: 'w-full',
      card: `bg-card text-card-foreground shadow-xl rounded-2xl border-0 ${isDark ? 'bg-zinc-900' : 'bg-white'}`,
      
      // Headers
      header: 'hidden', // We'll use custom header
      headerTitle: 'hidden',
      headerSubtitle: 'hidden',
      
      // Form elements
      formButtonPrimary: `
        bg-primary hover:bg-primary/90 text-primary-foreground 
        rounded-xl font-medium transition-all duration-200 
        shadow-sm hover:shadow-md active:scale-[0.98]
        ${isDark ? 'bg-sky-500 hover:bg-sky-600' : 'bg-sky-500 hover:bg-sky-600'}
      `,
      formButtonReset: 'text-muted-foreground hover:text-foreground underline-offset-4',
      formFieldInput: `
        rounded-lg border-input bg-background text-foreground
        focus:ring-2 focus:ring-primary focus:border-primary
        ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-300'}
      `,
      formFieldLabel: 'text-foreground font-medium',
      formFieldHintText: 'text-muted-foreground text-sm',
      formFieldErrorText: 'text-destructive text-sm',
      
      // Social buttons
      socialButtonsBlockButton: `
        border rounded-xl font-medium transition-all duration-200
        hover:bg-muted active:scale-[0.98]
        ${isDark ? 'border-zinc-700 hover:bg-zinc-800' : 'border-gray-300 hover:bg-gray-50'}
      `,
      socialButtonsBlockButtonText: 'text-foreground font-medium',
      socialButtonsProviderIcon: 'w-5 h-5',
      
      // Divider
      dividerLine: `${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`,
      dividerText: `text-muted-foreground text-sm ${isDark ? 'bg-zinc-900' : 'bg-white'} px-2`,
      
      // Links
      footerActionLink: `
        text-primary hover:text-primary/80 font-medium 
        underline-offset-4 hover:underline transition-colors
      `,
      identityPreviewText: 'text-foreground',
      identityPreviewEditButton: 'text-primary hover:text-primary/80',
      
      // Buttons
      formButtonSecondary: `
        bg-secondary text-secondary-foreground hover:bg-secondary/80
        rounded-xl font-medium transition-all duration-200
        ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}
      `,
      
      // Alerts and messages
      alert: `rounded-lg p-3 ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`,
      alertText: 'text-foreground',
      
      // User button
      userButtonBox: 'rounded-full',
      userButtonPopoverCard: `shadow-lg rounded-xl ${isDark ? 'bg-zinc-900' : 'bg-white'}`,
      
      // Avatar
      avatarBox: 'rounded-full ring-2 ring-offset-2 ring-offset-background ring-primary/20',
      
      // Loading
      spinner: 'text-primary',
      
      // Badges
      badge: `rounded-full px-2 py-1 text-xs font-medium ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`,
      
      // Tabs
      tabButton: 'text-muted-foreground hover:text-foreground transition-colors',
      tabButtonActive: 'text-foreground border-b-2 border-primary',
      
      // Modal
      modalContent: `rounded-2xl ${isDark ? 'bg-zinc-900' : 'bg-white'}`,
      modalCloseButton: 'text-muted-foreground hover:text-foreground',
    },
  }
}

// Admin-specific appearance (more conservative, professional)
export const getAdminClerkAppearance = (theme?: 'light' | 'dark'): Appearance => {
  const baseAppearance = getClerkAppearance(theme)
  const isDark = (theme || getCurrentTheme()) === 'dark'
  
  return {
    ...baseAppearance,
    variables: {
      ...baseAppearance.variables,
      colorPrimary: isDark ? '#6B7280' : '#1F2937', // Gray for admin
    },
    elements: {
      ...baseAppearance.elements,
      formButtonPrimary: `
        bg-gray-900 hover:bg-gray-800 text-white
        rounded-xl font-medium transition-all duration-200 
        shadow-sm hover:shadow-md active:scale-[0.98]
        ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-800'}
      `,
      socialButtonsBlockButton: 'hidden', // Hide social login for admin
    },
  }
}

// Student-specific appearance (more vibrant, welcoming)
export const getStudentClerkAppearance = (theme?: 'light' | 'dark'): Appearance => {
  const baseAppearance = getClerkAppearance(theme)
  const isDark = (theme || getCurrentTheme()) === 'dark'
  
  return {
    ...baseAppearance,
    variables: {
      ...baseAppearance.variables,
      colorPrimary: '#4F46E5', // Indigo for students
    },
    elements: {
      ...baseAppearance.elements,
      formButtonPrimary: `
        bg-indigo-600 hover:bg-indigo-700 text-white
        rounded-xl font-medium transition-all duration-200 
        shadow-sm hover:shadow-md active:scale-[0.98]
        ${isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700'}
      `,
    },
  }
}