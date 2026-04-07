import { useState, useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSchoolContext } from '@/stores/school-context-store';
import { useConversations } from '@/hooks/useConversations';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ConversationView } from '@/components/messaging/ConversationView';

export const Route = createFileRoute('/_authenticated/messages/')({
  component: MessagesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) ?? undefined,
  }),
});

/**
 * Per D-05, D-06, UI-SPEC:
 *  - Display title "Nachrichten" (28px)
 *  - Desktop: flex container with 360px ConversationList + flexible ConversationView
 *  - Mobile: show list by default; when conversation selected, navigate to /$conversationId
 */
function MessagesPage() {
  const navigate = useNavigate();
  const { id: selectedId } = Route.useSearch();
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

  const [search, setSearch] = useState('');
  const { data: conversations = [], isLoading } = useConversations(
    schoolId,
    search || undefined,
  );

  // Find the selected conversation for header details
  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const handleSelect = useCallback(
    (id: string) => {
      // Desktop: update search param. Mobile: navigate to detail route.
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        navigate({ to: '/messages/$conversationId', params: { conversationId: id } });
      } else {
        navigate({
          to: '/messages',
          search: () => ({ id }),
        });
      }
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-[28px] font-semibold leading-[1.2]">Nachrichten</h1>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* List-detail layout */}
      {!isLoading && (
        <div className="flex border border-border rounded-lg overflow-hidden bg-background" style={{ height: 'calc(100vh - 160px)' }}>
          {/* Conversation list (360px on desktop, full width on mobile when no selection) */}
          <div className="w-full sm:w-[360px] sm:shrink-0 sm:block hidden">
            <ConversationList
              conversations={conversations}
              activeId={selectedId ?? null}
              onSelect={handleSelect}
              search={search}
              onSearchChange={setSearch}
              schoolId={schoolId}
            />
          </div>

          {/* Mobile: show list when no selection, hide when selected */}
          <div className="sm:hidden w-full">
            {!selectedId ? (
              <ConversationList
                conversations={conversations}
                activeId={null}
                onSelect={handleSelect}
                search={search}
                onSearchChange={setSearch}
                schoolId={schoolId}
              />
            ) : (
              <ConversationView
                schoolId={schoolId}
                conversationId={selectedId}
                title={selectedConversation?.subject ?? undefined}
                scope={selectedConversation?.scope}
                memberCount={selectedConversation?.memberCount}
              />
            )}
          </div>

          {/* Detail panel (desktop) */}
          <div className="flex-1 hidden sm:block">
            {selectedId ? (
              <ConversationView
                schoolId={schoolId}
                conversationId={selectedId}
                title={selectedConversation?.subject ?? undefined}
                scope={selectedConversation?.scope}
                memberCount={selectedConversation?.memberCount}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  Waehlen Sie eine Unterhaltung aus der Liste
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
