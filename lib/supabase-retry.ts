interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
}

export async function withRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {},
): Promise<{ data: T | null; error: any }> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = options

  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()

      // Check if we got a rate limit error
      if (result.error?.code === "429" || result.error?.message?.includes("Too Many Requests")) {
        lastError = result.error

        if (attempt < maxRetries) {
          console.log(`[v0] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay = Math.min(delay * 2, maxDelay)
          continue
        }
      }

      return result
    } catch (error: any) {
      lastError = error

      // Check if it's a rate limit error
      if (error.message?.includes("Too Many Requests") || error.code === "429") {
        if (attempt < maxRetries) {
          console.log(`[v0] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay = Math.min(delay * 2, maxDelay)
          continue
        }
      }

      // For other errors, fail immediately
      return { data: null, error }
    }
  }

  return { data: null, error: lastError }
}
