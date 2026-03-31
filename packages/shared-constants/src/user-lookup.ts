/** Tìm user để thêm bạn — chỉ khớp chính xác username / email / phone (server). */
export const USER_LOOKUP = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 254,
  DEBOUNCE_MS: 350,
} as const
