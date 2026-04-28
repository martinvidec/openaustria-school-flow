import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useSchoolContext } from '@/stores/school-context-store';
import { useConversations } from '@/hooks/useConversations';
import { ConversationView } from '@/components/messaging/ConversationView';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute(
  '/_authenticated/messages/$conversationId',
)({
  component: ConversationDetailPage,
});

/**
 * Mobile conversation detail route. Renders ConversationView for a specific
 * conversation with a back button navigating to /messages.
 */
function ConversationDetailPage() {
  const navigate = useNavigate();
  const { conversationId } = Route.useParams();
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

  // Fetch conversations to get header details
  const { data: conversations = [] } = useConversations(schoolId);
  const conversation = conversations.find((c) => c.id === conversationId);

  return (
    <div className="flex flex-col h-screen">
      {/* Back button header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background shrink-0 sm:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/messages', search: { id: undefined } })}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold truncate">
          {conversation?.subject ?? 'Unterhaltung'}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <ConversationView
          schoolId={schoolId}
          conversationId={conversationId}
          title={conversation?.subject ?? undefined}
          scope={conversation?.scope}
          memberCount={conversation?.memberCount}
        />
      </div>
    </div>
  );
}
