const normalizeApiUrl = (url: string | undefined): string => {
  if (!url) return 'http://localhost:5000/api/v1';
  return url.endsWith('/api/v1') ? url : `${url.replace(/\/+$/, '')}/api/v1`;
};

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'A1 Raters',
  description: import.meta.env.VITE_APP_DESCRIPTION || 'Professional AI rating platform',
  apiUrl: normalizeApiUrl(import.meta.env.VITE_API_URL),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@a1raters.com',
  fromEmail: import.meta.env.VITE_FROM_EMAIL || 'noreply@a1raters.com',
  phoneNumber: import.meta.env.VITE_PHONE_NUMBER || '+1 (555) 123-4567',
  openaiApiUrl: import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1',
} as const;
