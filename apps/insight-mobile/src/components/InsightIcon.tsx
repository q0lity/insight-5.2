import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type InsightIconName =
  | 'home'
  | 'calendar'
  | 'check'
  | 'checkCircle'
  | 'dots'
  | 'sparkle'
  | 'plus'
  | 'minus'
  | 'play'
  | 'smile'
  | 'file'
  | 'target'
  | 'briefcase'
  | 'gift'
  | 'barChart'
  | 'users'
  | 'pin'
  | 'tag'
  | 'node'
  | 'settings'
  | 'chevronLeft'
  | 'chevronRight'
  | 'lock'
  | 'user'
  | 'cloud'
  | 'bell'
  | 'palette'
  | 'info'
  | 'help'
  | 'sync'
  | 'mail'
  | 'sparkles'
  | 'export'
  | 'trash'
  | 'keyboard'
  | 'signOut';

type Props = {
  name: InsightIconName;
  size?: number;
  color?: string;
};

export function InsightIcon({ name, size = 20, color = '#1C1C1E' }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 24 24' };

  switch (name) {
    case 'chevronLeft':
      return (
        <Svg {...common} fill="none">
          <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'home':
      return (
        <Svg {...common} fill="none">
          <Path
            d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V10.5z"
            stroke={color}
            strokeWidth={1.6}
          />
          <Path
            d="M9 22.5v-7.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7.2"
            stroke={color}
            strokeWidth={1.6}
          />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg {...common} fill="none">
          <Path d="M7 4v2M17 4v2M4.5 8.2h15" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path
            d="M6.2 5.5h11.6A2.2 2.2 0 0 1 20 7.7v12.1A2.2 2.2 0 0 1 17.8 22H6.2A2.2 2.2 0 0 1 4 19.8V7.7A2.2 2.2 0 0 1 6.2 5.5z"
            stroke={color}
            strokeWidth={1.6}
          />
          <Path
            d="M7.2 12.2h3.2M13.6 12.2h3.2M7.2 16.1h3.2M13.6 16.1h3.2"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...common} fill="none">
          <Path
            d="M9.2 12.3l2 2.1 5-5.2"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M6 4.8h12A2.2 2.2 0 0 1 20.2 7v12A2.2 2.2 0 0 1 18 21.2H6A2.2 2.2 0 0 1 3.8 19V7A2.2 2.2 0 0 1 6 4.8z"
            stroke={color}
            strokeWidth={1.6}
          />
        </Svg>
      );
    case 'dots':
      return (
        <Svg {...common} fill="none">
          <Path
            d="M6.5 12h.01M12 12h.01M17.5 12h.01"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg {...common} fill="none">
          <Path
            d="M12 2l1.1 4a3 3 0 0 0 2.1 2.1l4 1.1-4 1.1A3 3 0 0 0 13.1 14l-1.1 4-1.1-4A3 3 0 0 0 8.8 11.3l-4-1.1 4-1.1A3 3 0 0 0 10.9 6L12 2z"
            stroke={color}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path
            d="M19.2 16.2l.5 1.7a1.5 1.5 0 0 0 1 1l1.7.5-1.7.5a1.5 1.5 0 0 0-1 1l-.5 1.7-.5-1.7a1.5 1.5 0 0 0-1-1l-1.7-.5 1.7-.5a1.5 1.5 0 0 0 1-1l.5-1.7z"
            stroke={color}
            strokeWidth={1.4}
          />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'minus':
      return (
        <Svg {...common} fill="none">
          <Path d="M5 12h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'play':
      return (
        <Svg {...common} fill="none">
          <Path d="M5 3l14 9-14 9V3z" fill={color} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      );
    case 'checkCircle':
      return (
        <Svg {...common} fill="none">
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M22 4L12 14.01l-3-3" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'node':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" stroke={color} strokeWidth={1.6} />
          <Path d="M12 3v6M12 15v6M21 12h-6M9 12H3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'smile':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" stroke={color} strokeWidth={1.6} />
          <Path d="M8.5 10.2h.01M15.5 10.2h.01" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
          <Path
            d="M8.2 13.2c1 1.6 2.4 2.4 3.8 2.4s2.8-.8 3.8-2.4"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'file':
      return (
        <Svg {...common} fill="none">
          <Path
            d="M7 3.8h6.8l3.2 3.2V20A2.2 2.2 0 0 1 14.8 22H7A2.2 2.2 0 0 1 4.8 20V6A2.2 2.2 0 0 1 7 3.8z"
            stroke={color}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path d="M13.8 3.8V7H17" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M7.6 12h8.2M7.6 15.6h8.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'target':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" stroke={color} strokeWidth={1.6} />
          <Path d="M12 16a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke={color} strokeWidth={1.6} />
          <Path d="M12 13a1 1 0 1 0-1-1 1 1 0 0 0 1 1z" fill={color} />
        </Svg>
      );
    case 'briefcase':
      return (
        <Svg {...common} fill="none">
          <Path
            d="M6 8.5h12a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 2-2z"
            stroke={color}
            strokeWidth={1.6}
          />
          <Path d="M9 8.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5" stroke={color} strokeWidth={1.6} />
          <Path d="M12 13v3M4 12.5h16" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'gift':
      return (
        <Svg {...common} fill="none">
          <Path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" stroke={color} strokeWidth={1.6} />
          <Path d="M2 8a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8z" stroke={color} strokeWidth={1.6} />
          <Path d="M12 22V7M7.5 7c-1.5 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3M16.5 7c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'barChart':
      return (
        <Svg {...common} fill="none">
          <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'users':
      return (
        <Svg {...common} fill="none">
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'pin':
      return (
        <Svg {...common} fill="none">
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth={1.6} />
          <Path d="M12 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" stroke={color} strokeWidth={1.6} />
        </Svg>
      );
    case 'tag':
      return (
        <Svg {...common} fill="none">
          <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke={color} strokeWidth={1.6} />
          <Path d="M7 7h.01" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 15a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" stroke={color} strokeWidth={1.6} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={1.6} />
        </Svg>
      );
    case 'lock':
      return (
        <Svg {...common} fill="none">
          <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke={color} strokeWidth={1.6} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'chevronRight':
      return (
        <Svg {...common} fill="none">
          <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'user':
      return (
        <Svg {...common} fill="none">
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke={color} strokeWidth={1.6} />
        </Svg>
      );
    case 'cloud':
      return (
        <Svg {...common} fill="none">
          <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg {...common} fill="none">
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'palette':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      );
    case 'info':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth={1.6} />
          <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'help':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth={1.6} />
          <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M12 17h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'sync':
      return (
        <Svg {...common} fill="none">
          <Path d="M23 4v6h-6M1 20v-6h6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'mail':
      return (
        <Svg {...common} fill="none">
          <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={1.6} />
          <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'sparkles':
      return (
        <Svg {...common} fill="none">
          <Path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      );
    case 'export':
      return (
        <Svg {...common} fill="none">
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M17 8l-5-5-5 5M12 3v12" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'trash':
      return (
        <Svg {...common} fill="none">
          <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'keyboard':
      return (
        <Svg {...common} fill="none">
          <Path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke={color} strokeWidth={1.6} />
          <Path d="M6 13h.01M12 13h.01M18 13h.01M7 9h.01M11 9h.01M17 9h.01M8 17h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'signOut':
      return (
        <Svg {...common} fill="none">
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
}
