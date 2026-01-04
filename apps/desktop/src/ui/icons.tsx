type Props = {
  size?: number
  className?: string
}

export type IconName =
  | 'home'
  | 'calendar'
  | 'mic'
  | 'check'
  | 'dots'
  | 'bolt'
  | 'sparkle'
  | 'smile'
  | 'frown'
  | 'droplet'
  | 'maximize'
  | 'play'
  | 'pause'
  | 'plus'
  | 'panelLeft'
  | 'panelRight'
  | 'x'
  | 'sun'
  | 'moon'
  | 'tag'
  | 'trophy'
  | 'heart'
  | 'file'
  | 'target'
  | 'gear'
  | 'phone'
  | 'food'
  | 'dumbbell'
  | 'cart'
  | 'tooth'
  | 'briefcase'
  | 'stethoscope'
  | 'pin'
  | 'book'
  | 'moonStar'
  | 'users'
  | 'folder'
  | 'chevronDown'
  | 'chevronRight'
  | 'grip'
  | 'palette'
  | 'monitor'

export function Icon(
  props: Props & {
    name: IconName
  }
) {
  const size = props.size ?? 18
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const }

  switch (props.name) {
    case 'home':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V10.5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M9 22.5v-7.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7.2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M7 4v2M17 4v2M4.5 8.2h15"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M6.2 5.5h11.6A2.2 2.2 0 0 1 20 7.7v12.1A2.2 2.2 0 0 1 17.8 22H6.2A2.2 2.2 0 0 1 4 19.8V7.7A2.2 2.2 0 0 1 6.2 5.5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M7.2 12.2h3.2M13.6 12.2h3.2M7.2 16.1h3.2M13.6 16.1h3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'mic':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M12 14.3a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4.3a3 3 0 0 0 3 3z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M6.6 11.3a5.4 5.4 0 0 0 10.8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 16.7V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9.2 21h5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M9.2 12.3l2 2.1 5-5.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 4.8h12A2.2 2.2 0 0 1 20.2 7v12A2.2 2.2 0 0 1 18 21.2H6A2.2 2.2 0 0 1 3.8 19V7A2.2 2.2 0 0 1 6 4.8z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      )
    case 'dots':
      return (
        <svg {...common} className={props.className}>
          <path d="M6.5 12h.01M12 12h.01M17.5 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'bolt':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M13 2L4 14.2h7l-1 7.8 9-12.2h-7L13 2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'sparkle':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M12 2l1.1 4a3 3 0 0 0 2.1 2.1l4 1.1-4 1.1A3 3 0 0 0 13.1 14l-1.1 4-1.1-4A3 3 0 0 0 8.8 11.3l-4-1.1 4-1.1A3 3 0 0 0 10.9 6L12 2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M19.2 16.2l.5 1.7a1.5 1.5 0 0 0 1 1l1.7.5-1.7.5a1.5 1.5 0 0 0-1 1l-.5 1.7-.5-1.7a1.5 1.5 0 0 0-1-1l-1.7-.5 1.7-.5a1.5 1.5 0 0 0 1-1l.5-1.7z" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
    case 'smile':
      return (
        <svg {...common} className={props.className}>
          <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.5 10.2h.01M15.5 10.2h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M8.2 13.2c1 1.6 2.4 2.4 3.8 2.4s2.8-.8 3.8-2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'frown':
      return (
        <svg {...common} className={props.className}>
          <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.5 10.2h.01M15.5 10.2h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M8.2 16.2c1-1.6 2.4-2.4 3.8-2.4s2.8.8 3.8 2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'droplet':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M12 2.8s6 6.6 6 11.2a6 6 0 0 1-12 0c0-4.6 6-11.2 6-11.2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'maximize':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'play':
      return (
        <svg {...common} className={props.className}>
          <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
          <path
            d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10z"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.5"
          />
        </svg>
      )
    case 'pause':
      return (
        <svg {...common} className={props.className}>
          <path d="M9.2 8h1.8v8H9.2V8zM13 8h1.8v8H13V8z" fill="currentColor" />
          <path
            d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10z"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.5"
          />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} className={props.className}>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'panelLeft':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M5.5 4.5h13A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M9 5v14" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
        </svg>
      )
    case 'panelRight':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M5.5 4.5h13A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M15 5v14" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common} className={props.className}>
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M12 18.2a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M12 2.6v2.2M12 19.2v2.2M4.2 12h2.2M17.6 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'moon':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M20.5 14.3a7.8 7.8 0 0 1-10.8-10 8.7 8.7 0 1 0 10.8 10z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M8.2 4.8l2.2-.6a1.2 1.2 0 0 1 1.4.6l1.1 2.6a1.2 1.2 0 0 1-.3 1.3l-1.2 1.1a12.3 12.3 0 0 0 5.8 5.8l1.1-1.2a1.2 1.2 0 0 1 1.3-.3l2.6 1.1a1.2 1.2 0 0 1 .6 1.4l-.6 2.2a1.6 1.6 0 0 1-1.6 1.2C10 21.6 2.4 14 3.6 6.4A1.6 1.6 0 0 1 4.8 4.8z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'food':
      return (
        <svg {...common} className={props.className}>
          <path d="M7 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7 8c2.5 0 2.5-5 0-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 3v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M17 3v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 7h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M15.5 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'dumbbell':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M5.5 9.2v5.6M8 8v8M16 8v8M18.5 9.2v5.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'cart':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M6 6h15l-2 8H8L6 6z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M6 6L5 3H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9 20a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 9 20zM18 20a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 18 20z" fill="currentColor" opacity="0.8" />
        </svg>
      )
    case 'tooth':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M8.5 4.5c1.2-.7 2.3-1 3.5-1s2.3.3 3.5 1c1.8 1.1 2.6 3.2 2.1 5.2l-1.1 4.2c-.4 1.6-1.3 3-2.6 4.1-.8.7-1.9.2-2.1-.8l-.7-3.4c-.2-1.1-1.8-1.1-2 0l-.7 3.4c-.2 1-1.3 1.5-2.1.8-1.3-1.1-2.2-2.5-2.6-4.1L3.9 9.7c-.5-2 .3-4.1 2.1-5.2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M5.5 7h13A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-8A2.5 2.5 0 0 1 5.5 7z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
        </svg>
      )
    case 'stethoscope':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M7 4v5a5 5 0 0 0 10 0V4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M12 14v2.2a4.8 4.8 0 0 0 9.6 0V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M21.6 12.6a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M12 22s7-6.1 7-12.2A7 7 0 0 0 5 9.8C5 15.9 12 22 12 22z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'book':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M6.2 4.5h9.4A2.4 2.4 0 0 1 18 6.9V21H7.2A2.7 2.7 0 0 0 4.5 18.3V6.2A1.7 1.7 0 0 1 6.2 4.5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M18 21V6.9A2.4 2.4 0 0 1 20.4 4.5H21" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
        </svg>
      )
    case 'moonStar':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M20.5 14.3a7.8 7.8 0 0 1-10.8-10 8.7 8.7 0 1 0 10.8 10z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M7 14.2l.6 2a1.5 1.5 0 0 0 1 1l2 .6-2 .6a1.5 1.5 0 0 0-1 1l-.6 2-.6-2a1.5 1.5 0 0 0-1-1l-2-.6 2-.6a1.5 1.5 0 0 0 1-1l.6-2z"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.9"
          />
        </svg>
      )
    case 'users':
      return (
        <svg {...common} className={props.className}>
          <path d="M9 12.2a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16.5 11.4a2.6 2.6 0 1 0-2.6-2.6 2.6 2.6 0 0 0 2.6 2.6z" stroke="currentColor" strokeWidth="1.6" opacity="0.75" />
          <path
            d="M3.8 20.2a5.2 5.2 0 0 1 10.4 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M13.6 20.2a4.2 4.2 0 0 1 6.6 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      )
    case 'tag':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M3.5 11.2V6.5A3 3 0 0 1 6.5 3.5h4.7a2.5 2.5 0 0 1 1.8.7l8 8a2.5 2.5 0 0 1 0 3.6l-5.2 5.2a2.5 2.5 0 0 1-3.6 0l-8-8a2.5 2.5 0 0 1-.7-1.8z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M7.6 7.6h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      )
    case 'trophy':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M7 4.5h10v3.2a5 5 0 0 1-10 0V4.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M7 6.5H4.8A2.3 2.3 0 0 0 2.5 8.8v.3A3.7 3.7 0 0 0 6.2 12.8H7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M17 6.5h2.2a2.3 2.3 0 0 1 2.3 2.3v.3a3.7 3.7 0 0 1-3.7 3.7H17"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M12 12.5v3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8.5 20.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9.8 15.7h4.4v4.8H9.8v-4.8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M12 21s-7-4.6-8.7-9.2C2.1 8.2 4.4 5.5 7.4 5.5c1.7 0 3.2.9 4.1 2.2.9-1.3 2.4-2.2 4.1-2.2 3 0 5.3 2.7 4.1 6.3C19 16.4 12 21 12 21z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'file':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M7 3.8h6.8l3.2 3.2V20A2.2 2.2 0 0 1 14.8 22H7A2.2 2.2 0 0 1 4.8 20V6A2.2 2.2 0 0 1 7 3.8z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M13.8 3.8V7H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7.6 12h8.2M7.6 15.6h8.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'target':
      return (
        <svg {...common} className={props.className}>
          <path d="M12 21a9 9 0 1 0-9-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 18a6 6 0 1 0-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 15a3 3 0 1 0-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M19 5l2 2-6.5 6.5-2.5.5.5-2.5L19 5z" fill="currentColor" opacity="0.9" />
        </svg>
      )
    case 'gear':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M19.4 13.1l1.6-1.1-1.6-1.1a7.9 7.9 0 0 0-.6-1.4l.8-1.8-1.9-.8-1.2 1.5a8.2 8.2 0 0 0-1.5-.6L13.1 3h-2.2L10 4.8c-.5.1-1 .3-1.5.6L7.3 3.9l-1.9.8.8 1.8c-.2.4-.4.9-.6 1.4L3 10.9 1.4 12 3 13.1c.1.5.3 1 .6 1.4l-.8 1.8 1.9.8 1.2-1.5c.5.3 1 .5 1.5.6l.9 1.8h2.2l.9-1.8c.5-.1 1-.3 1.5-.6l1.2 1.5 1.9-.8-.8-1.8c.3-.4.5-.9.6-1.4z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            opacity="0.85"
          />
        </svg>
      )
    case 'folder':
      return (
        <svg {...common} className={props.className}>
          <path
            d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'chevronDown':
      return (
        <svg {...common} className={props.className}>
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'chevronRight':
      return (
        <svg {...common} className={props.className}>
          <path d="M10 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'grip':
      return (
        <svg {...common} className={props.className}>
          <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'palette':
      return (
        <svg {...common} className={props.className}>
          <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" />
          <path
            d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.75 1.5-1.5 0-.38-.14-.72-.36-1-.22-.27-.36-.61-.36-1 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.97-4.49-9-10-9z"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      )
    case 'monitor':
      return (
        <svg {...common} className={props.className}>
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common} className={props.className}>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'grid':
      return (
        <svg {...common} className={props.className}>
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common} className={props.className}>
          <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      )
  }
}
