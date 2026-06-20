import { createClient } from '@supabase/supabase-js'

const COOKIE_DOMAIN = '.logyard.app'
const COOKIE_EXPIRES_DAYS = 365

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name, value) {
  const expires = new Date(Date.now() + COOKIE_EXPIRES_DAYS * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; domain=${COOKIE_DOMAIN}; path=/; expires=${expires}; SameSite=Lax; Secure`
}

function removeCookie(name) {
  document.cookie = `${name}=; domain=${COOKIE_DOMAIN}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

const cookieStorage = {
  getItem: (key) => getCookie(key),
  setItem: (key, value) => setCookie(key, value),
  removeItem: (key) => removeCookie(key),
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: cookieStorage, storageKey: 'logyard-auth' } }
)
