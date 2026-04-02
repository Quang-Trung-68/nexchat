export const postsInfiniteKeys = {
  list: (scope: 'timeline' | 'mine', q: string) => ['posts', 'infinite', scope, q] as const,
}

export const postKeys = {
  detail: (id: string) => ['posts', 'detail', id] as const,
  comments: (id: string) => ['posts', 'comments', id] as const,
  likers: (id: string) => ['posts', 'likers', id] as const,
}
