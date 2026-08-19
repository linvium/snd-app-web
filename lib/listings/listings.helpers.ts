export function shareInflightPromise<T>(fn: () => Promise<T>): () => Promise<T> {
  let inflight: Promise<T> | null = null
  return () => {
    if (!inflight) {
      inflight = fn().catch((error) => {
        inflight = null
        throw error
      })
    }
    return inflight
  }
}
