import { useState } from 'react';
import type { ConversationDto } from '@schoolflow/shared';
import { Search, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ConversationListItem } from './ConversationListItem';
import { ComposeDialog } from './ComposeDialog';
import { AbsenceQuickAction } from './AbsenceQuickAction';

/**
 * Per D-05, D-06, UI-SPEC: Scrollable conversation list. Search Input at top
 * with placeholder "Unterhaltungen durchsuchen". "Neue Nachricht" button below
 * search opens ComposeDialog. Sorted by last message timestamp desc.
 * Empty state: "Keine Unterhaltungen" / "Starten Sie eine neue Nachricht...".
 */

interface ConversationListProps {
  conversations: ConversationDto[];
  activeId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  schoolId: string;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  search,
  onSearchChange,
  schoolId,
}: ConversationListProps) {
  const [composeOpen, setComposeOpen] = useState(false);

  // Sort by last message timestamp descending (most recent first)
  const sorted = [...conversations].sort((a, b) => {
    const dateA = a.lastMessage?.createdAt ?? a.createdAt;
    const dateB = b.lastMessage?.createdAt ?? b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Search + New message */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Unterhaltungen durchsuchen"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => setComposeOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Nachricht
          </Button>
          <AbsenceQuickAction schoolId={schoolId} />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm font-semibold text-foreground">
              Keine Unterhaltungen
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Starten Sie eine neue Nachricht...
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeId}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Compose dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        schoolId={schoolId}
      />
    </div>
  );
}
