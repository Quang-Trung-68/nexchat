import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AddFriendDialog } from './AddFriendDialog'
import { CreateGroupDialog } from './CreateGroupDialog'
import { MessageSearchResultsDropdown } from './MessageSearchResultsDropdown'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'
import { useMessageSearch } from '@/features/messages/hooks/useMessageSearch'

export type SearchScopeTab = 'all' | 'contacts' | 'messages' | 'files'


type MessageSearch = ReturnType<typeof useMessageSearch>

export type ChatGlobalSearchToolbarProps = {
  q: string
  onQChange: (v: string) => void
  searchFocused: boolean
  onSearchFocusChange: (v: boolean) => void
  searchScopeTab: SearchScopeTab
  onSearchScopeTabChange: (v: SearchScopeTab) => void
  messageSearch: MessageSearch
  onCloseSearchUi: () => void
}

/** Cùng hành vi tìm tin nhắn toàn cục như cột danh sách hội thoại trên `/chat`. */
export function ChatGlobalSearchToolbar({
  q,
  onQChange,
  searchFocused,
  onSearchFocusChange,
  searchScopeTab,
  messageSearch,
  onCloseSearchUi,
}: ChatGlobalSearchToolbarProps) {
  const navigate = useNavigate()

  const scopeAllowsMessageSearch = searchScopeTab === 'all' || searchScopeTab === 'messages'

  const showSearchDropdown =
    searchFocused &&
    scopeAllowsMessageSearch &&
    q.trim().length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH

  return (
    <div className="relative z-30 shrink-0 border-b border-border/60">
      <div className="flex items-center gap-1.5 p-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            onFocus={() => onSearchFocusChange(true)}
            onBlur={() => window.setTimeout(() => onSearchFocusChange(false), 180)}
            placeholder="Tìm kiếm"
            className="h-9 rounded-full border-border/80 bg-[#f4f5f7] pl-9 pr-9 text-sm shadow-none"
            aria-label="Tìm kiếm toàn cục"
          />
          {q ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onQChange('')}
              aria-label="Xóa ô tìm"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <AddFriendDialog />
        <CreateGroupDialog />
      </div>

      {showSearchDropdown ? (
        <MessageSearchResultsDropdown
          query={messageSearch.debouncedQuery}
          items={messageSearch.items}
          isLoading={messageSearch.isLoading}
          isError={messageSearch.isError}
          showConversationLabel
          onPick={(hit) => {
            onCloseSearchUi()
            navigate(`/chat/${hit.conversationId}`, {
              state: { focusMessageId: hit.messageId },
            })
          }}
          className="shadow-md"
        />
      ) : null}

      {searchFocused && messageSearch.showHint && scopeAllowsMessageSearch ? (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
          Nhập ít nhất {SEARCH_MESSAGES.MIN_QUERY_LENGTH} ký tự
        </p>
      ) : null}

      {searchFocused &&
        q.trim().length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH &&
        !scopeAllowsMessageSearch ? (
        <p className="px-3 py-3 text-center text-xs text-muted-foreground">
          Tìm theo Liên hệ / File — sắp có
        </p>
      ) : null}
    </div>
  )
}

/** Bản tự quản state — dùng trên `/contacts` (giống hành vi cột trái `/chat`). */
export function ChatGlobalSearchToolbarStandalone() {
  const [q, setQ] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchScopeTab, setSearchScopeTab] = useState<SearchScopeTab>('all')

  const scopeAllowsMessageSearch = searchScopeTab === 'all' || searchScopeTab === 'messages'

  const messageSearch = useMessageSearch({
    mode: 'global',
    conversationId: undefined,
    rawQuery: q,
    enabled: searchFocused && scopeAllowsMessageSearch,
  })

  const closeSearchUi = () => {
    setQ('')
    setSearchFocused(false)
  }

  return (
    <ChatGlobalSearchToolbar
      q={q}
      onQChange={setQ}
      searchFocused={searchFocused}
      onSearchFocusChange={setSearchFocused}
      searchScopeTab={searchScopeTab}
      onSearchScopeTabChange={setSearchScopeTab}
      messageSearch={messageSearch}
      onCloseSearchUi={closeSearchUi}
    />
  )
}
