import { Page } from '@playwright/test'

/**
 * Mock Web Speech API for testing voice capture without actual microphone
 */
export async function mockWebSpeechAPI(page: Page, transcript: string, options?: {
  delay?: number
  interimResults?: boolean
  continuous?: boolean
}) {
  const delay = options?.delay ?? 500
  const interimResults = options?.interimResults ?? true
  const continuous = options?.continuous ?? true

  await page.evaluate(({ transcript, delay, interimResults, continuous }) => {
    // @ts-ignore - Mocking browser API
    window.SpeechRecognition = window.webkitSpeechRecognition = class MockSpeechRecognition {
      continuous = continuous
      interimResults = interimResults
      lang = 'en-US'
      maxAlternatives = 1

      onresult: ((event: any) => void) | null = null
      onerror: ((event: any) => void) | null = null
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onspeechstart: (() => void) | null = null
      onspeechend: (() => void) | null = null

      private timeout: number | null = null
      private isStarted = false

      start() {
        if (this.isStarted) return
        this.isStarted = true

        // Fire onstart
        if (this.onstart) {
          setTimeout(() => this.onstart?.(), 50)
        }

        // Fire onspeechstart
        if (this.onspeechstart) {
          setTimeout(() => this.onspeechstart?.(), 100)
        }

        // Simulate interim results if enabled
        if (this.interimResults && this.onresult) {
          const words = transcript.split(' ')
          let accumulated = ''

          words.forEach((word, index) => {
            accumulated += (index > 0 ? ' ' : '') + word

            setTimeout(() => {
              if (this.onresult) {
                this.onresult({
                  results: [{
                    0: { transcript: accumulated },
                    isFinal: false,
                    length: 1
                  }],
                  resultIndex: 0
                })
              }
            }, delay + (index * 200))
          })

          // Final result
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript },
                  isFinal: true,
                  length: 1
                }],
                resultIndex: 0
              })
            }
          }, delay + (words.length * 200) + 100)
        } else {
          // Just fire final result
          this.timeout = window.setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript },
                  isFinal: true,
                  length: 1
                }],
                resultIndex: 0
              })
            }
          }, delay)
        }
      }

      stop() {
        if (!this.isStarted) return
        this.isStarted = false

        if (this.timeout !== null) {
          clearTimeout(this.timeout)
          this.timeout = null
        }

        // Fire onspeechend
        if (this.onspeechend) {
          setTimeout(() => this.onspeechend?.(), 50)
        }

        // Fire onend
        if (this.onend) {
          setTimeout(() => this.onend?.(), 100)
        }
      }

      abort() {
        this.stop()
      }
    }
  }, { transcript, delay, interimResults, continuous })
}

/**
 * Setup quick mock for simple transcript injection
 */
export async function setupQuickMock(page: Page, transcript: string) {
  await mockWebSpeechAPI(page, transcript, { delay: 200, interimResults: false })
}

/**
 * Setup realistic mock with interim results
 */
export async function setupRealisticMock(page: Page, transcript: string) {
  await mockWebSpeechAPI(page, transcript, { delay: 500, interimResults: true })
}
