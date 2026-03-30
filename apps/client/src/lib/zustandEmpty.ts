/**
 * Tham chiếu ổn định cho selector Zustand — tránh `?? []` trong `useStore` (mỗi lần tạo mảng mới → infinite loop).
 */
export const EMPTY_STRING_ARRAY: string[] = []
