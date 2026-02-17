// Clerk appearance configuration for AgentTailor branding.
// The appearance object is passed to ClerkProvider and individual Clerk components.
// We use `as const` and rely on TypeScript's structural typing rather than
// importing Appearance directly (it's internal to @clerk/shared/types).

export const clerkAppearance = {
  variables: {
    colorPrimary: '#4f46e5',
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorInputBackground: '#f8fafc',
    colorInputText: '#0f172a',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  elements: {
    card: 'shadow-lg border border-slate-200',
    headerTitle: 'text-slate-900 font-bold',
    headerSubtitle: 'text-slate-500',
    formButtonPrimary:
      'bg-indigo-600 hover:bg-indigo-700 text-white font-medium',
    formFieldInput:
      'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500',
    footerActionLink: 'text-indigo-600 hover:text-indigo-700',
    identityPreviewEditButton: 'text-indigo-600 hover:text-indigo-700',
    avatarBox: 'ring-2 ring-indigo-100',
  },
} as const;
