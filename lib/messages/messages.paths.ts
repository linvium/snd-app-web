export const REQUESTS_PATH = '/profile/requests'

export function requestThreadPath(id: string): string {
  return `${REQUESTS_PATH}/${id}`
}
