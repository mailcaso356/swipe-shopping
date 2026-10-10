import { load, save } from './storage'
import { supabase } from './supabase'

/**
 * Parte social (supabase/schema-4.sql): profili con nome generato, amici, liste regalo, sondaggi.
 * Solo azioni prestabilite: nessun testo libero scritto dagli utenti.
 */

export interface SocialCard {
  handle: string
  avatar: string
  code: string
}

export interface MyProfile extends SocialCard {
  share_saves: boolean
  followers: number
  following: number
}

export interface GiftListSummary {
  id: string
  template: GiftTemplate
  product_ids: string[]
}

export interface PollSummary {
  id: string
  product_ids: string[]
  closes_at: string
  closed?: boolean
  voters?: number
}

export interface FriendProfile extends SocialCard {
  is_me: boolean
  following: boolean
  follows_me: boolean
  followers: number
  lists: GiftListSummary[]
  polls: PollSummary[]
}

export type FeedItem =
  | { kind: 'poll'; id: string; product_ids: string[]; at: string; who: SocialCard }
  | { kind: 'list'; id: string; template: GiftTemplate; product_ids: string[]; at: string; who: SocialCard }
  | { kind: 'saves'; product_ids: string[]; count: number; at: string; who: SocialCard }

export interface GiftList extends GiftListSummary {
  owner: SocialCard
  is_owner: boolean
  updated_at: string
  claims: { product_id: string; mine: boolean }[]
}

export interface Poll extends PollSummary {
  owner: SocialCard
  is_owner: boolean
  closed: boolean
  voters: number
  my_votes: Record<string, boolean>
  results: { product_id: string; yes: number; no: number }[] | null
}

/** Avatar disponibili (gli stessi del database). */
export const AVATARS = ['🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🦄', '🐙', '🐝', '🦋', '🐢', '🐬', '🦉', '🐰', '🐱', '🐶', '🦔', '🦦', '🦩', '🐳', '🐺', '🐻', '🐹', '🐥']

export const GIFT_TEMPLATES = {
  compleanno: { label: 'Il mio compleanno', emoji: '🎂' },
  natale: { label: 'Natale', emoji: '🎄' },
  laurea: { label: 'La mia laurea', emoji: '🎓' },
  matrimonio: { label: 'Matrimonio', emoji: '💍' },
  casa_nuova: { label: 'Casa nuova', emoji: '🏡' },
  idee_regalo: { label: 'Idee regalo', emoji: '🎁' },
  desideri: { label: 'I miei desideri', emoji: '✨' },
} as const
export type GiftTemplate = keyof typeof GIFT_TEMPLATES

export const POLL_MAX = 5
export const LIST_MAX = 60

/** Messaggi d'errore del database in italiano semplice. */
function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('could not find the function') || m.includes('does not exist')) return 'Funzione non ancora attiva. Riprova più tardi.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Connessione assente. Riprova.'
  return message
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Account non disponibile.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(friendly(error.message))
  return data as T
}

/** Chi vota senza account: un codice casuale salvato sul telefono. */
function anonVoter() {
  let id = load<string | null>('pollVoter', null)
  if (!id) {
    id = `anon:${crypto.randomUUID()}`
    save('pollVoter', id)
  }
  return id
}

export const social = {
  me: () => rpc<MyProfile>('social_me'),
  update: (patch: { regenerate?: boolean; avatar?: string; shareSaves?: boolean }) =>
    rpc<MyProfile>('social_update', {
      regenerate: patch.regenerate ?? false,
      new_avatar: patch.avatar ?? null,
      new_share_saves: patch.shareSaves ?? null,
    }),
  profile: (code: string) => rpc<FriendProfile | null>('social_profile', { p_code: code }),
  follow: (code: string) => rpc<void>('social_follow', { p_code: code }),
  unfriend: (code: string, action: 'unfollow' | 'remove' | 'block') => rpc<void>('social_unfriend', { p_code: code, action }),
  friends: () => rpc<{ following: SocialCard[]; followers: SocialCard[] }>('social_friends'),
  feed: () => rpc<FeedItem[]>('social_feed'),
  mine: () => rpc<{ lists: GiftListSummary[]; polls: PollSummary[] }>('social_mine'),
  saveList: (id: string | null, template: GiftTemplate, productIds: string[]) =>
    rpc<string>('gift_list_save', { p_id: id, p_template: template, p_product_ids: productIds.slice(0, LIST_MAX) }),
  deleteList: (id: string) => rpc<void>('gift_list_delete', { p_id: id }),
  list: (id: string) => rpc<GiftList | null>('gift_list_get', { p_id: id }),
  claim: (id: string, productId: string, claim: boolean) => rpc<void>('gift_list_claim', { p_id: id, p_product_id: productId, p_claim: claim }),
  createPoll: (productIds: string[]) => rpc<string>('poll_create', { p_product_ids: productIds.slice(0, POLL_MAX) }),
  deletePoll: (id: string) => rpc<void>('poll_delete', { p_id: id }),
  poll: (id: string) => rpc<Poll | null>('poll_get', { p_id: id, p_voter: anonVoter() }),
  vote: (id: string, productId: string, yes: boolean) =>
    rpc<void>('poll_vote', { p_id: id, p_voter: anonVoter(), p_product_id: productId, p_yes: yes }),
}

// --- Link ---
const SITE = 'https://swipeshopping.app/'
export const profileUrl = (code: string) => `${SITE}#/u/${code}`
export const pollUrl = (id: string) => `${SITE}#/sondaggio/${id}`
export const giftListUrl = (id: string) => `${SITE}#/regalo/${id}`

/** Parte dell'indirizzo dopo #/<prefisso>/ (es. il codice di #/u/abc). */
export function hashParam(prefix: string, hash = window.location.hash) {
  const m = hash.match(new RegExp(`^#/?${prefix}/([A-Za-z0-9-]+)`))
  return m ? m[1] : null
}

/** Pannello di condivisione del telefono; dove non c'è copia il link. */
export async function shareLink(text: string, url: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Swipe Shopping', text, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  await navigator.clipboard?.writeText(`${text}\n${url}`)
  return 'copied'
}

/** "2 ore fa", "ieri", "3 giorni fa" */
export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min fa`
  if (s < 86400) return `${Math.round(s / 3600)} ore fa`
  const d = Math.round(s / 86400)
  return d === 1 ? 'ieri' : `${d} giorni fa`
}
