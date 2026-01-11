# Premium iOS App Design Research

A comprehensive analysis of the most beautiful production iOS apps, documenting their design systems, interaction patterns, and visual excellence.

---

## 1. Stripe Dashboard

### Overview
Stripe's design system powers their financial UI, emphasizing clarity, trust, and professional aesthetics for handling sensitive financial data.

### Layout Grid System
- **Grid Foundation**: 8pt base grid with flexible column layouts
- **Container-Based**: Uses container components that adapt to content
- **Figma UI Toolkit**: Complete design system available at @stripedesign on Figma Community
- **Responsive Patterns**: Adaptive layouts designed to work across Dashboard contexts

### Spacing Rhythm
- **Base Unit**: 8px increments for major spacing
- **Fine Control**: 4px for tighter UI elements
- **Grid Variables**: `gridRowSpacing` and `gridColumnSpacing` tokens for consistent rhythm
- **Border Radius**: Consistent corner rounding through `borderRadius` tokens

### Color Palette
- **Primary**: Stripe's signature purple (#635BFF)
- **Neutral Scale**: Clean grays for hierarchy and depth
- **Status Colors**: Distinct colors for success, warning, error states
- **Trust-Focused**: Colors chosen to convey security and reliability

### Typography Hierarchy
- **System Integration**: Uses `fontSizeBase` and `fontWeight` properties
- **Limited Custom Styling**: Intentionally restricted to maintain platform consistency
- **Accessibility-First**: High contrast ratios and readable sizes

### Animation Timing Curves
- **Loading States**: Skeleton states with subtle pulse animations
- **Transitions**: Smooth state changes between data loads
- **Spinner Integration**: Consistent loading indicators across views

### Unique Interaction Patterns
- **Direct Dashboard Links**: Empty states link directly to relevant Dashboard pages (Customers, Payments)
- **Progressive Disclosure**: Information revealed as needed
- **Pattern Library**: Documented patterns for common UX scenarios

### Empty States Design
- **Clear Messaging**: Explicit communication when no data is available
- **Actionable**: Links to create content or navigate to relevant sections
- **Consistent Styling**: Matches overall Dashboard aesthetic

### Loading States
- **Skeleton Screens**: Placeholder UI showing structure before data loads
- **Progressive Loading**: Primary content loads first, secondary follows
- **Spinner Components**: Built-in loading indicators

---

## 2. Linear Mobile

### Overview
Linear represents the pinnacle of task management UI, designed for technical users with smooth flows, lean visuals, and immediate state changes.

### Layout Grid System
- **Inverted L-Shape**: Global chrome controls content in main view
- **Clean Hierarchy**: Minimal UI elements with maximum information density
- **Focus Mode**: Reduced chrome for concentrated work

### Spacing Rhythm
- **Tight Transitions**: Minimal spacing between related elements
- **Breathable Lists**: Generous padding in task lists for scannability
- **Consistent Margins**: Predictable edge spacing throughout

### Color Palette
- **Monochromatic Core**: Predominantly grayscale with color accents
- **Status Indicators**: Color-coded priority and status badges
- **Dark Mode First**: Designed primarily for dark interfaces
- **Liquid Glass Integration**: Apple's translucent material language (2025)

### Typography Hierarchy
- **SF Pro Integration**: System font for native feel
- **Weight Variation**: Bold for titles, regular for content
- **Compact Density**: Optimized for information scanning

### Animation Timing Curves
- **Spring Physics**: Natural motion using spring animations
- **Duration**: Quick transitions (~0.2-0.3s for micro-interactions)
- **Damping**: High damping for snappy, non-bouncy motion
- **Resource**: Detailed animations documented at 60fps.design/apps/linear

### Unique Interaction Patterns
- **Gesture Navigation**: Edge swipes for quick navigation
- **Keyboard-First**: Extensive keyboard shortcuts (desktop parity)
- **Inline Editing**: Edit tasks without modal interruption
- **Real-Time Sync**: Immediate state reflection across devices

### Empty States Design
- **Minimal Illustrations**: Simple, monochrome graphics
- **Action-Oriented**: Clear CTAs to create first items
- **Contextual Help**: Tips relevant to the empty section

### Loading States
- **Skeleton UI**: Matching content structure
- **Optimistic Updates**: UI updates before server confirmation
- **Background Sync**: Non-blocking data refreshes

---

## 3. Notion iOS

### Overview
Notion exemplifies content flexibility, serving as workspace for notes, databases, wikis, and project management with a unified visual language.

### Layout Grid System
- **Block-Based**: Every piece of content is a movable block
- **Flexible Columns**: Drag-to-resize column layouts
- **Full-Width Option**: Content can expand edge-to-edge
- **Sidebar Navigation**: Collapsible page tree structure

### Spacing Rhythm
- **Clean Line Spacing**: Optimized for extended reading
- **Calculated Padding**: Sidebar shows masterful spacing balance
- **Block Margins**: Consistent spacing between content blocks
- **Icon Alignment**: Precise positioning of inline icons

### Color Palette
- **Warm Grays**: Soft neutrals instead of harsh blacks
- **Accent Colors**: Subtle color coding for organization
- **Customizable Highlights**: User-selectable highlight colors
- **Background Options**: Cover images and colorful page backgrounds
- **Brand Colors**: Available on Mobbin with official Hex, RGB, CMYK codes

### Typography Hierarchy
- **Primary Typeface**: Inter (open-source sans-serif by Rasmus Andersson)
- **Weight Scale**: Regular (400), Medium (500), Bold (700)
- **Font Options**: Default, Serif, Mono user selection
- **Small Text Toggle**: Compact reading mode
- **X-Height**: Tall x-height improves reading comfort
- **Cross-Platform**: Consistent rendering across all devices

### Animation Timing Curves
- **Subtle Transitions**: Non-distracting page and block movements
- **Duration**: ~0.2s for quick feedback
- **Easing**: Ease-out curves for natural deceleration

### Unique Interaction Patterns
- **Slash Commands**: `/` to insert any content type
- **Drag Handles**: Six-dot handles for block reordering
- **@-Mentions**: Link people, pages, dates inline
- **Toggle Blocks**: Expandable/collapsible sections
- **Database Views**: Table, board, calendar, gallery, list

### Empty States Design
- **Placeholder Text**: "Type '/' for commands" guidance
- **Template Suggestions**: Recommended starting points
- **Welcoming**: Friendly, non-intimidating blank pages

### Loading States
- **Incremental Loading**: Page structure appears, then content
- **Shimmer Effects**: Subtle loading indicators
- **Offline Support**: Cached content available immediately

---

## 4. Arc Browser

### Overview
Arc redefines mobile browsing with innovative navigation, adaptive theming, and space-based organization. Winner of 2025 Red Dot Design Award for Interface Design.

### Layout Grid System
- **Spaces Architecture**: Distinct environments for different contexts
- **Tab Organization**: Vertical tab management
- **Command Center**: Customizable quick-access controls
- **Thumb Zone**: Key elements within natural thumb reach

### Spacing Rhythm
- **Edge-to-Edge**: Content fills screen with minimal chrome
- **Compact Controls**: Condensed UI for maximum viewport
- **Generous Touch Targets**: Balanced with information density

### Color Palette
- **Adaptive Theming**: Colors adjust to complement current website
- **Space Colors**: Each space can have distinct color identity
- **Dynamic Backgrounds**: Responsive to content
- **Skeuomorphic Touches**: Physical material references

### Typography Hierarchy
- **System Fonts**: SF Pro for native consistency
- **URL Bar**: Clear, readable address display
- **Tab Labels**: Truncated with smart ellipsis

### Animation Timing Curves
- **Fluid Gestures**: Smooth swipe and pinch responses
- **Spring Motion**: Natural physics-based animations
- **Quick Feedback**: Sub-300ms interaction responses

### Unique Interaction Patterns
- **Edge Swipes**: Navigate with thumb gestures
- **Pinch to Manage**: Gesture-based tab overview
- **Boosts**: Custom per-site modifications
- **Little Arc**: Quick browser for links
- **Spaces**: Contextual browsing environments

### Empty States Design
- **New Tab Art**: Beautiful, rotating featured content
- **Onboarding**: Guided space creation
- **Favorites Prompt**: Encourage pinning frequent sites

### Loading States
- **Progress Indicator**: Minimal, unobtrusive loading bar
- **Skeleton Content**: Page structure preview
- **Instant Navigation**: Cached page previews

---

## 5. Things 3

### Overview
Things 3 by Cultured Code is the gold standard for task management design—completely rebuilt from the ground up with a timeless design, delightful interactions, and powerful features. Winner of multiple Apple Design Awards.

### Layout Grid System
- **Single Column Focus**: Primary task list centered
- **Sidebar Areas**: Today, Upcoming, Anytime, Someday, Logbook
- **Project Hierarchy**: Nested areas and projects
- **Quick Entry**: Bottom-positioned Magic Plus button
- **Vector Graphics**: All icons scale beautifully at any size

### Spacing Rhythm
- **8pt Grid**: Apple-aligned spacing system
- **Generous Whitespace**: Tasks breathe with ample margins
- **Group Separation**: Clear visual breaks between sections
- **Touch-Friendly**: Large tap targets (44pt minimum)
- **Dynamic Scaling**: Layout fine-tuned so everything scales together

### Color Palette
- **Pure White/Black**: Clean background states
- **Accent Blue**: Primary action color
- **Tag Colors**: User-customizable tag system
- **Subtle Shadows**: Depth without distraction
- **Evening Amber**: Warm evening theme option
- **Glassy Buttons**: Subtle glow and scale on touch

### Typography Hierarchy
- **SF Pro Display**: Large titles and headers (20pt+)
- **SF Pro Text**: Task and note content (body text)
- **Hierarchical Weights**: Clear distinction between title/subtitle/body
- **Dynamic Type**: Full system-wide accessibility support
- **Auto-Scaling**: Interface follows system Dynamic Type setting

### Animation Timing Curves
- **Purposeful Motion**: "Each animation is purposeful"
- **Tactile Feedback**: Quick, responsive interactions with haptics
- **Spring Physics**: Natural bounce on drag-drop
- **Duration**: ~0.25s for transitions
- **Damping**: High (~0.8) for snappy completion
- **Rubberbanding**: Delightful bounce at resize limits
- **Drag Flocking**: Smooth animation when reordering multiple to-dos

### Unique Interaction Patterns
- **Magic Plus Button**: Liquid, deformable button that responds to movement
  - Drag to insert tasks at specific positions
  - Subtle glow on touch interaction
  - Command where to place new items
- **Natural Language Input**: "Meeting tomorrow at 3pm"
- **Drag Scheduling**: Drop tasks onto calendar
- **To-Do as Objects**: Boundaries materialize on interaction
- **Multi-Select Swipe**: Enter selection mode via gesture
- **Left-Right Swipe**: Assign starting dates
- **Drag-Create**: Drag + button into list to add items
- **Haptic Feedback**: Full support on compatible devices
- **Headings**: Organize tasks within projects
- **Checklists**: Subtasks for complex items

### Empty States Design
- **Celebratory**: "All Clear" with cheerful messaging
- **Achievement Feel**: Completing all tasks feels rewarding
- **Minimal Illustration**: Simple, elegant graphics
- **Icon Animation**: Restored in recent updates

### Loading States
- **Instant Launch**: Local-first architecture
- **Sync Indicator**: Subtle cloud sync status
- **No Blocking**: Never waits on network

### Craftmanship Details
- **Help Tags**: Animate in with feedback, context, and keyboard shortcuts
- **Custom AppKit**: Fundamental pieces customized for polish
- **Window Resizing**: Rubberbanding effect at limits
- **Keyboard Shortcut UI**: Simple, intuitive tags panel

---

## 6. Fantastical

### Overview
Fantastical by Flexibits delivers award-winning calendar design with natural language parsing, beautiful views, and exquisite interface craftsmanship. The design is clean, the layout intuitive, and adding events feels effortless.

### Layout Grid System
- **DayTicker View**: Unique horizontal date scroller with colorful event pills
- **Calendar Views**: Day, week, month, quarter, year
- **Split Layout**: List and calendar combination
- **Widget System**: 16 home screen widgets + 4 lock screen widgets
  - Small (2x2), Medium (2x4), Large (4x4) sizes
  - Lock screen: Up Next (Inline/Circular/Rectangular), Calendar, Quick Action

### Spacing Rhythm
- **Event Pills**: Color-coded time blocks showing approximate day position
- **Time Grid**: Clear hour demarcations
- **Event Density**: Comfortable stacking of overlapping events
- **8pt Alignment**: Consistent with iOS guidelines
- **Colorful Bars**: Multi-day event visualization at top

### Color Palette
- **Calendar Colors**: Distinct colors per calendar source
- **Color-Coded Dots**: Day overview indicators showing event density
- **Heat Map View**: Year view with darker colors = more events
- **Work/Personal Split**: Visual separation by life area
- **Light/Dark Modes**: Fully light, fully dark, or automatic combination
- **App Icon Options**: Dark and tinted versions (iOS 18+)
- **Liquid Glass**: Updated design for iOS 26

### Typography Hierarchy
- **Time Display**: Bold, readable event times
- **Event Titles**: Medium weight for scannability
- **Details**: Lighter weight for location/notes
- **Month Headers**: Large, clear date navigation

### Animation Timing Curves
- **View Transitions**: Smooth switches between calendar views
- **DayTicker Scroll**: Fluid horizontal momentum
- **Event Reveal**: Elegant expand/collapse
- **Duration**: ~0.3s standard transitions

### Unique Interaction Patterns
- **Natural Language Parsing**: "Lunch with Sarah tomorrow noon"
- **Apple Intelligence Integration**: Complex sentence recognition (iOS 26+)
- **Calendar Sets**: Quick context switching between life contexts
- **Conference Call Detection**: Auto-extracts meeting links
- **Weather Integration**: Forecast in day view
- **Tasks Integration**: Reminders alongside events
- **Month Navigation Arrows**: Tap to navigate in widgets

### Empty States Design
- **Day Preview**: Shows day structure even without events
- **"Free" Indication**: Clear availability display
- **Onboarding**: Calendar connection guidance

### Loading States
- **Calendar Sync**: Background refresh indicators
- **Event Creation**: Instant local creation, background sync
- **Shimmer**: Subtle loading for remote calendars

---

## 7. Craft

### Overview
Craft delivers next-generation document design with native performance, beautiful typography, and whitespace that makes content shine. Winner of Apple Design Award aesthetics.

### Layout Grid System
- **Block-Based Layout**: Flexible content blocks
- **Full-Bleed Images**: Edge-to-edge media support
- **Page Structure**: Cards that nest infinitely
- **Responsive Canvas**: Adapts to device size

### Spacing Rhythm
- **Generous Whitespace**: Tapping into document reveals breathing room
- **Block Padding**: Consistent internal spacing
- **Margin Options**: Customizable page margins
- **Line Spacing**: Optimized for readability

### Color Palette
- **Page Backgrounds**: Colorful background options
- **Block Accents**: Colored framing for focus blocks
- **Cover Images**: Header imagery support
- **Highlight Colors**: Multiple text highlight options
- **Subtle Tones**: Soft, non-distracting palettes

### Typography Hierarchy
- **Four Font Styles**: Document-wide font selection
- **Title/Subtitle/Caption**: Clear heading hierarchy
- **Per-Block Fonts**: Individual block customization
- **Dynamic Type**: System accessibility support

### Animation Timing Curves
- **Native Performance**: 60fps throughout
- **Block Transitions**: Smooth reorganization
- **Page Navigation**: Fluid depth transitions
- **Duration**: Quick, snappy ~0.2s interactions

### Unique Interaction Patterns
- **Deep Linking**: Block-level linking
- **Backlinks**: Automatic reference tracking
- **Slash Commands**: Quick block insertion
- **Image Galleries**: Auto-formatted collections
- **Daily Notes**: Built-in journaling
- **Share Extensions**: Beautiful public sharing

### Empty States Design
- **Template Gallery**: Starting point suggestions
- **Blank Canvas**: Clean, inviting empty document
- **Quick Start**: Recent and pinned items

### Loading States
- **Instant Local**: Offline-first architecture
- **Sync Status**: Subtle cloud indicators
- **Image Loading**: Placeholder aspect ratios

---

## 8. Bear

### Overview
Bear by Shiny Frog is note-taking nirvana—an app closer in spirit to old-school typewriters and handwritten journals, offering distraction-free writing with exquisite typography. Winner of 2017 Apple Design Award and 2016 App of the Year.

### Layout Grid System
- **Three-Column Layout**: Sidebar, notes list, editor (iPad)
- **Single Focus**: Editor-first on iPhone
- **Tag Navigation**: Nested tag hierarchy
- **Minimal Chrome**: Editor maximizes content space

### Spacing Rhythm
- **Customizable Margins**: User-defined page margins
- **Line Spacing Options**: Adjustable line height
- **Paragraph Spacing**: Configurable block gaps
- **Tight Typography**: Compact but readable defaults

### Color Palette
- **28 Themes**: Curated theme collection (Pro feature)
- **Free Themes**: Essential options available free
- **Highlight Colors**: Per-theme highlight defaults
- **Background Tones**: From bright whites to deep blacks
- **Accent Colors**: Theme-coordinated interactive elements

### Typography Hierarchy
- **Bear Sans**: Custom typeface (Clarika-based by Brandon Knap)
- **Geometric + Grotesque**: Hybrid style for legibility
- **Customizable Font**: User font selection
- **Font Size Options**: Adjustable reading size
- **Markdown Styling**: Headers, bold, italic rendered beautifully

### Animation Timing Curves
- **Minimal Motion**: Deliberate restraint in animations
- **Focus Transitions**: Smooth panel reveals
- **Note Opening**: Quick, non-intrusive
- **Duration**: ~0.2s for navigations

### Unique Interaction Patterns
- **Markdown Support**: Full formatting via text
- **WikiLinks**: [[Note linking]] syntax
- **Tags as Folders**: #nested/tag organization
- **Focus Mode**: Sentence/paragraph highlighting
- **Export Options**: PDF, HTML, DOCX, more
- **Handwriting**: Apple Pencil support on iPad

### Empty States Design
- **Welcome Note**: First-run tutorial note
- **Release Notes**: Built-in update documentation
- **Clean Blank**: Inviting empty editor

### Loading States
- **Instant Access**: Local-first, no loading delays
- **Sync Badge**: iCloud sync status indicator
- **Search Results**: Instant filtering

---

## 9. Carrot Weather

### Overview
Carrot Weather is the crazy-powerful, privacy-conscious weather app that delivers hilariously twisted forecasts. Winner of Apple's App of the Year, Apple Design Award, App Store Editors' Choice, and Apple Watch App of the Year. Featured by The New York Times, Good Morning America, CNN, and Wired.

### Layout Grid System
- **Modular Components**: Fully customizable layout via Layout screen
- **Section-Based**: Current, hourly, daily, radar map sections
- **Widget Library**: 12+ widget types in multiple sizes
  - Snark, Forecast, Hourly, Daily, Weather Map
- **Apple Watch**: Vertical tab view for current/hourly/daily

### Spacing Rhythm
- **Data Density Options**: User controls information density
- **Component Flexibility**: Add, rearrange, resize sections
- **Watch Complications**: 20+ complications in various sizes
- **Consistent Padding**: Balanced spacing around data points

### Color Palette
- **Condition-Based Backgrounds**: Colors reflect weather conditions
- **Splashy Data Screens**: Colorful displays for humidity, UV, sunrise/sunset
- **Three Precipitation Palettes**: User-selectable map color schemes
- **Custom Widget Colors**: Choose background colors or condition-reactive
- **Bold Chunky Icons**: High-legibility weather symbols

### Typography Hierarchy
- **Temperature Prominence**: Large, bold current temp
- **Data Labels**: Clear metric identification
- **Personality Text**: Distinctive snark/commentary styling
- **Watch Legibility**: Icons built for smallest complications

### Animation Timing Curves
- **Environmental Animations**: Trees, smoke react to wind speed
- **Nuclear Reactor Easter Egg**: Interactive power plant animation
- **Character Animations**: CARROT personality expressions
- **Map Layer Transitions**: Smooth radar playback
- **Resource**: Animations documented at 60fps.design/apps/carrot

### Unique Interaction Patterns
- **Personality System**: 5 modes (Professional → Overkill)
  - Professional: Traditional weather, no jokes
  - Friendly: Light personality
  - Snarky: Teasing commentary
  - Homicidal: Dark humor
  - Overkill: Profanity filter needed
- **Layout Customization**: Build ideal weather app from components
- **Line Charts**: Hourly/daily with customizable intersection points
- **Map Inspector**: Eyedropper tool with crosshairs for precipitation data
- **3D Globe View**: Toggle between 2D map and 3D globe
- **Six Map Styles**: Multiple visual presentations
- **12 Weather Layers**: Toggle individual data visualizations

### Widget & Complication Design
- **iOS Widgets**: 12 rich widget options
- **Apple Watch**: 20+ complications
  - Temperature, conditions, wind, UV, humidity, cloud cover
  - Custom multi-data combinations
  - Half-hourly background updates (Premium)
- **Watch Face Gallery**: Pre-designed faces with complications
- **StandBy Widgets**: iPhone horizontal mode support
- **Lock Screen**: iPad Lock Screen widget support

### Empty States Design
- **Location Prompt**: Clear guidance for location access
- **Personality-Driven**: Empty states maintain CARROT's voice
- **Onboarding**: Introduction to personality selection

### Loading States
- **Fast Map Loading**: Rebuilt maps for speed
- **Layer Toggle**: Quick on/off for weather layers
- **Background Refresh**: Non-blocking data updates

### Customization Philosophy
- **"Most Customizable Weather App"**: Every aspect adjustable
- **Native UI Elements**: Fits iOS aesthetic while retaining personality
- **Brighter, Cleaner Design**: v5.0 modernized interface
- **Personality Toggle**: Fun animations even without dialogue

---

## Cross-App Design Patterns

### Common Grid Systems
| App | Base Unit | Approach |
|-----|-----------|----------|
| All Apps | 8pt | iOS standard alignment |
| Fine Details | 4pt | Icons, tight spacing |
| Touch Targets | 44pt+ | Minimum tap area |

### Animation Timing Standards
| Type | Duration | Damping | Use Case |
|------|----------|---------|----------|
| Micro-interaction | 0.15-0.2s | 0.85-0.9 | Button taps, toggles |
| Page Transition | 0.25-0.35s | 0.8-0.85 | Navigation |
| Spring Bounce | 0.4-0.6s | 0.6-0.7 | Drag completion |
| Modal Present | 0.3s | 0.85 | Sheet presentation |

### SwiftUI Spring Defaults
```swift
// Standard spring
.spring(response: 0.55, dampingFraction: 0.825)

// Interactive spring (quicker)
.interactiveSpring(response: 0.15, dampingFraction: 0.86)

// iOS 17+ simplified
.spring(duration: 0.5, bounce: 0.2)
```

### Typography Patterns
- **System Font**: SF Pro for native feel (most apps)
- **Custom Identity**: Bear Sans, Inter (Notion)
- **Dynamic Type**: Essential for accessibility
- **Weight Scale**: Regular → Medium → Semibold → Bold

### Empty State Best Practices
1. **Show, Don't Just Tell**: Preview filled state or use illustrations
2. **Action-Oriented**: Clear CTA to resolve emptiness
3. **Celebratory When Complete**: "All caught up!" messaging
4. **Brand Consistent**: Match overall design language

### Loading State Patterns
1. **Skeleton Screens**: Structure placeholder before content
2. **Optimistic Updates**: UI changes before server confirms
3. **Background Sync**: Non-blocking data refresh
4. **Progressive Loading**: Critical content first

---

## 2025 iOS Design Trends

### Liquid Glass (iOS 26+)
Apple's most significant visual update since 2013:
- **Translucent Materials**: Glass-like UI elements with refraction
- **Dynamic Depth**: Layers float above content
- **Light Response**: UI reacts to motion and light
- **Universal Application**: Navigation bars, modals, controls

### Spring-First Animation
- SwiftUI defaults to spring animations
- Duration + Bounce model replaces mass/stiffness/damping
- Natural, physics-based motion throughout

### Gesture Navigation
- Edge swipes for 15% faster interactions
- Thumb-zone optimization
- Reduced reliance on navigation bars

---

## Sources

### Stripe
- [Stripe Apps Design Documentation](https://docs.stripe.com/stripe-apps/design)
- [Empty State Pattern](https://docs.stripe.com/stripe-apps/patterns/empty-state)
- [Stripe Apps UI Toolkit - Figma](https://www.figma.com/community/file/1105918844720321397/stripe-apps-ui-toolkit)

### Linear
- [Linear Design System - Figma](https://www.figma.com/community/file/1222872653732371433/linear-design-system)
- [How We Redesigned Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Liquid Glass](https://linear.app/now/linear-liquid-glass)
- [Linear iOS Animations - 60fps.design](https://60fps.design/apps/linear)

### Notion
- [Notion Brand Colors - Mobbin](https://mobbin.com/colors/brand/notion)
- [Notion Sidebar UI Breakdown](https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d)
- [Notion Typography - What Font](https://www.designyourway.net/blog/what-font-does-notion-use/)

### Arc Browser
- [Arc Browser Review 2025](https://www.technicalexplore.com/tech/arc-browser-review-2025-redefining-the-web-experience)
- [Arc Search iOS UI Design](https://www.banani.co/references/apps/arc-search)
- [Arc Browser - SaaS UI](https://www.saasui.design/application/arc-browser)

### Things 3
- [Things 3 Features - Cultured Code](https://culturedcode.com/things/features/)
- [Things 3 iOS UI - Banani](https://www.banani.co/references/apps/things-3)
- [Using Gestures - Things Support](https://culturedcode.com/things/support/articles/2803582/)
- [An Ode to Cultured Code](https://medium.com/@jordanborth/an-ode-to-cultured-code-and-things-3-292e20112624)
- [Things Big and Small - Cultured Code Blog](https://culturedcode.com/things/blog/2023/09/things-big-and-small/)

### Fantastical
- [Fantastical Official](https://flexibits.com/fantastical)
- [Fantastical iOS Help](https://flexibits.com/fantastical-ios/help)
- [Fantastical Widgets - MacStories](https://www.macstories.net/reviews/fantasticals-widgets-pair-interactivity-with-superior-design/)
- [Fantastical 3.2 Widgets](https://flexibits.com/blog/2020/09/fantastical-3-2-is-here-with-12-all-new-widgets-scribble-for-ipad-and-more/)

### Craft
- [Craft Official](https://www.craft.do/)
- [Craft Review - MacStories](https://www.macstories.net/reviews/craft-review-a-powerful-native-notes-and-collaboration-app/)

### Bear
- [Bear Official](https://bear.app/)
- [Bear Themes](https://bear.app/faq/about-free-and-pro-themes-in-bear/)
- [Meet Bear Sans](https://blog.bear.app/2023/08/learn-about-our-new-custom-font-bear-sans/)

### Carrot Weather
- [Carrot Weather Official](https://www.meetcarrot.com/weather/)
- [Behind the Design: Carrot Weather - Apple Developer](https://developer.apple.com/news/?id=kf623ldf)
- [Carrot Weather iOS Animations - 60fps.design](https://60fps.design/apps/carrot)
- [Carrot Weather v5.0 Introduction](http://www.meetcarrot.com/weather/v5.html)
- [Carrot Weather 5.5 Maps - MacStories](https://www.macstories.net/reviews/carrot-5-5-debuts-redesigned-weather-maps-with-expanded-customization-options/)
- [Carrot Weather iOS 14 Widgets - 9to5Mac](https://9to5mac.com/2020/09/16/carrot-weather-shines-on-ios-14-with-12-rich-widgets-25-apple-watch-complications-more/)
- [Carrot Weather Watch Redesign - 9to5Mac](https://9to5mac.com/2023/09/18/carrot-weather-apple-watch-overhaul-iphone-standby-widgets/)

### iOS Design Guidelines
- [8pt Grid System](https://medium.com/ios-os-x-development/ios-hard-soft-8-point-grids-6d2d1dc2fcf7)
- [Apple Spring Animations - WWDC23](https://developer.apple.com/videos/play/wwdc2023/10158/)
- [SwiftUI Spring Documentation](https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:))
- [Empty State Best Practices - Mobbin](https://mobbin.com/glossary/empty-state)
