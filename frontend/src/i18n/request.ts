import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  // Get locale from cookies or default to 'tr'
  const cookieStore = cookies()
  const locale = cookieStore.get('locale')?.value || 'tr'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})