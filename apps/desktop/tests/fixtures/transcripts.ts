/**
 * Mock transcript samples for testing various scenarios
 */

export const MOCK_TRANSCRIPTS = {
  simple: "This is a test note about today's meeting",

  withTags: "Met with @JohnDoe at !office to discuss #project deadline",

  withTime: "09:15 - Morning standup with the team #meeting",

  longForm: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
This is a longer note that spans multiple sentences and paragraphs. It helps test how the UI handles more substantial content.
We want to ensure that scrolling works properly, the preview panel renders correctly, and the textarea auto-expands as expected.
The character count should update in real time, showing the total length of this longer transcript.`,

  withCheckboxes: `- [ ] Review PR
- [ ] Update docs
- [x] Fix bug`,

  withMarkdown: `# Meeting Notes
## Action Items
- Fix critical bug
**Important**: Ship by Friday`,

  multiLanguage: "Bonjour! こんにちは Testing multilingual input 你好",

  specialChars: "Test!@#$%^&*()_+-={}[]|\\:\";<>?,./~`",

  edgeCaseEmpty: "",

  edgeCaseWhitespace: "   ",

  edgeCaseNewlines: "\n\n\n",

  veryLong: "A".repeat(10000),

  withPeople: "@Alice @Bob @Charlie discussed the project roadmap",

  withLocations: "Met at !headquarters then moved to !coffeeshop for brainstorming",

  withProjects: "Working on +mobile-redesign and +api-optimization",

  withContext: "During /standup we reviewed /sprint-planning items",

  realistic: `Had a productive meeting with @Sarah about the Q1 roadmap.
Key takeaways:
- [ ] Finalize designs by next week
- [ ] Schedule follow-up with engineering team
- [x] Send proposal to stakeholders
Priority: #high #urgent
Location: !office conference room A`,

  withEmoji: "Great meeting today! 🎉 Need to follow up on action items 📝",

  withMath: "The formula is $E = mc^2$ and the calculation shows $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",

  withCode: `Fixed the bug in the authentication flow:
\`\`\`javascript
function authenticate(user) {
  return jwt.sign({ id: user.id }, SECRET);
}
\`\`\``,
}

export type TranscriptKey = keyof typeof MOCK_TRANSCRIPTS
