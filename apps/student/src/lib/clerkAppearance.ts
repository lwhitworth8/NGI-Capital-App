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
    primary: '#4F46E5', // Indigo for students
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
    primary: '#6366F1', // Lighter indigo for dark mode
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

export const getStudentClerkAppearance = (theme?: 'light' | 'dark'): Appearance => {
  const currentTheme = theme || getCurrentTheme()
  const isDark = currentTheme === 'dark'
  const themeColors = isDark ? colors.dark : colors.light

  return {
    baseTheme: isDark ? dark : undefined,
    layout: {
      socialButtonsPlacement: 'top', // Google first for students
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
      card: `bg-card text-card-foreground shadow-xl rounded-2xl border-0 ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`,
      
      // Headers - custom header outside Clerk component
      header: 'hidden',
      headerTitle: 'hidden',
      headerSubtitle: 'hidden',
      
      // Form elements
      formButtonPrimary: `
        bg-indigo-600 hover:bg-indigo-700 text-white
        rounded-xl font-medium transition-all duration-200 
        shadow-sm hover:shadow-md active:scale-[0.98]
        ${isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700'}
      `,
      formButtonReset: 'text-muted-foreground hover:text-foreground underline-offset-4',
      formFieldInput: `
        rounded-lg border-input bg-background text-foreground
        focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        transition-colors duration-200
        ${isDark ? 'bg-zinc-800 border-zinc-700 focus:bg-zinc-700' : 'bg-white border-gray-300'}
      `,
      formFieldLabel: 'text-foreground font-medium mb-1.5',
      formFieldHintText: 'text-muted-foreground text-sm mt-1',
      formFieldErrorText: 'text-destructive text-sm mt-1',
      
      // Social buttons - Google prominently displayed
      socialButtonsBlockButton: `
        border rounded-xl font-medium transition-all duration-200
        hover:bg-muted active:scale-[0.98] flex items-center justify-center gap-3
        ${isDark ? 'border-zinc-700 hover:bg-zinc-800 bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50 bg-white'}
      `,
      socialButtonsBlockButtonText: 'text-foreground font-medium',
      socialButtonsProviderIcon: 'w-5 h-5',
      
      // Divider
      dividerLine: `${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`,
      dividerText: `text-muted-foreground text-sm ${isDark ? 'bg-zinc-900' : 'bg-white'} px-3`,
      
      // Links
      footerActionLink: `
        text-indigo-600 hover:text-indigo-700 font-medium 
        underline-offset-4 hover:underline transition-colors
        ${isDark ? 'text-indigo-400 hover:text-indigo-300' : ''}
      `,
      identityPreviewText: 'text-foreground',
      identityPreviewEditButton: `
        text-indigo-600 hover:text-indigo-700
        ${isDark ? 'text-indigo-400 hover:text-indigo-300' : ''}
      `,
      
      // Secondary buttons
      formButtonSecondary: `
        bg-secondary text-secondary-foreground hover:bg-secondary/80
        rounded-xl font-medium transition-all duration-200
        ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}
      `,
      
      // Alerts and messages
      alert: `rounded-lg p-4 ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-blue-50 border border-blue-200'}`,
      alertText: `${isDark ? 'text-zinc-200' : 'text-blue-900'}`,
      
      // User button
      userButtonBox: 'rounded-full',
      userButtonPopoverCard: `shadow-lg rounded-xl ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`,
      
      // Avatar
      avatarBox: 'rounded-full ring-2 ring-offset-2 ring-offset-background ring-indigo-500/20',
      
      // Loading
      spinner: 'text-indigo-600',
      
      // Badges
      badge: `rounded-full px-3 py-1 text-xs font-medium ${isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-indigo-100 text-indigo-700'}`,
      
      // Tabs
      tabButton: 'text-muted-foreground hover:text-foreground transition-colors font-medium',
      tabButtonActive: 'text-foreground border-b-2 border-indigo-600',
      
      // Modal
      modalContent: `rounded-2xl ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`,
      modalCloseButton: 'text-muted-foreground hover:text-foreground transition-colors',
      
      // Alternative actions
      alternativeMethodsBlockButton: `
        text-sm text-muted-foreground hover:text-foreground 
        transition-colors underline-offset-4 hover:underline
      `,
    },
  }
}