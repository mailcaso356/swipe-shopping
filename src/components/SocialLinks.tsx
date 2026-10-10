import { SOCIAL_LINKS } from '../config/app'

const InstagramIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const TikTokIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
  </svg>
)

const LINKS = [
  { label: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
  { label: 'TikTok', href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon },
]

/** I profili social dell'app, come riga "Seguici" con icone tonde (in fondo al menu Sezioni). */
export function SocialLinks() {
  return (
    <div className="flex items-center justify-between gap-3 px-2.5 py-2">
      <span className="text-sm font-semibold">Seguici</span>
      <span className="flex gap-2">
        {LINKS.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Swipe Shopping su ${label}`}
            className="grid size-9 place-items-center rounded-full bg-neutral-900 text-white active:scale-90"
          >
            <Icon className="size-4.5" />
          </a>
        ))}
      </span>
    </div>
  )
}
