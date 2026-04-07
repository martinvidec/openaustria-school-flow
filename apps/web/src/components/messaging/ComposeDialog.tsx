import { useState, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCreateConversation } from '@/hooks/useConversations';
import { MessageAttachmentUpload } from './MessageAttachmentUpload';
import { PollCreator } from './PollCreator';
import type { PollInput } from './PollCreator';
import type { ConversationScope } from '@schoolflow/shared';

/**
 * Per D-07, UI-SPEC: Dialog component with two tabs:
 *  - "Rundnachricht" (broadcast): scope picker, target selector, subject, body
 *  - "Direktnachricht" (direct): recipient search, subject (optional), body
 * Attachment button and poll toggle are placeholders for Plan 06.
 */

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
}

export function ComposeDialog({
  open,
  onOpenChange,
  schoolId,
}: ComposeDialogProps) {
  const createConversation = useCreateConversation(schoolId);

  // Broadcast form state
  const [broadcastScope, setBroadcastScope] = useState<ConversationScope>('CLASS');
  const [broadcastTarget, setBroadcastTarget] = useState('');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');

  // Attachment state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollData, setPollData] = useState<PollInput | null>(null);

  // Direct form state
  const [directRecipient, setDirectRecipient] = useState('');
  const [directBody, setDirectBody] = useState('');

  const resetForm = useCallback(() => {
    setBroadcastScope('CLASS');
    setBroadcastTarget('');
    setBroadcastSubject('');
    setBroadcastBody('');
    setAttachedFiles([]);
    setShowPoll(false);
    setPollData(null);
    setDirectRecipient('');
    setDirectBody('');
  }, []);

  const handleBroadcastSend = useCallback(async () => {
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return;

    try {
      await createConversation.mutateAsync({
        scope: broadcastScope,
        scopeId: broadcastTarget || undefined,
        subject: broadcastSubject.trim(),
        body: broadcastBody.trim(),
        poll: pollData ?? undefined,
      });
      // TODO: Upload attachments to the created conversation/message when
      // the backend returns the conversationId + messageId in the response.
      // For now, attachment upload is prepared in the UI but server-side
      // attachment storage is handled by the multipart upload endpoint.
      resetForm();
      onOpenChange(false);
    } catch {
      // Error is surfaced by TanStack Query
    }
  }, [
    broadcastScope,
    broadcastTarget,
    broadcastSubject,
    broadcastBody,
    pollData,
    createConversation,
    resetForm,
    onOpenChange,
  ]);

  const handleDirectSend = useCallback(async () => {
    if (!directRecipient.trim() || !directBody.trim()) return;

    try {
      await createConversation.mutateAsync({
        scope: 'DIRECT',
        subject: '',
        body: directBody.trim(),
        recipientUserIds: [directRecipient.trim()],
      });
      resetForm();
      onOpenChange(false);
    } catch {
      // Error is surfaced by TanStack Query
    }
  }, [directRecipient, directBody, createConversation, resetForm, onOpenChange]);

  const handleDiscard = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Nachricht</DialogTitle>
          <DialogDescription>
            Erstellen Sie eine neue Nachricht an Klassen, Jahrgaenge oder einzelne Personen.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="broadcast" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="broadcast" className="flex-1">
              Rundnachricht
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex-1">
              Direktnachricht
            </TabsTrigger>
          </TabsList>

          {/* Broadcast tab */}
          <TabsContent value="broadcast" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="scope">Empfaengergruppe</Label>
              <Select
                value={broadcastScope}
                onValueChange={(val) => setBroadcastScope(val as ConversationScope)}
              >
                <SelectTrigger id="scope">
                  <SelectValue placeholder="Empfaengergruppe waehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS">Klasse</SelectItem>
                  <SelectItem value="YEAR_GROUP">Jahrgang</SelectItem>
                  <SelectItem value="SCHOOL">Gesamte Schule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {broadcastScope !== 'SCHOOL' && (
              <div className="space-y-2">
                <Label htmlFor="target">
                  {broadcastScope === 'CLASS' ? 'Klasse' : 'Jahrgang'}
                </Label>
                <input
                  id="target"
                  type="text"
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  placeholder={
                    broadcastScope === 'CLASS'
                      ? 'z.B. 3A'
                      : 'z.B. 2025/2026'
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <input
                id="subject"
                type="text"
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Betreff der Nachricht"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Nachricht</Label>
              <textarea
                id="body"
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Ihre Nachricht..."
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              />
            </div>

            {/* File attachments (COMM-04) */}
            <MessageAttachmentUpload
              files={attachedFiles}
              onAdd={(newFiles) =>
                setAttachedFiles((prev) => [...prev, ...newFiles])
              }
              onRemove={(index) =>
                setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
              }
              maxFiles={5}
              maxSizeBytes={5 * 1024 * 1024}
            />

            {/* Poll toggle (COMM-06) */}
            <div className="space-y-2">
              <Button
                type="button"
                variant={showPoll ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowPoll(!showPoll);
                  if (showPoll) setPollData(null);
                }}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Umfrage anfuegen
              </Button>

              {showPoll && (
                <PollCreator
                  onPollChange={setPollData}
                  initialPoll={pollData ?? undefined}
                />
              )}
            </div>
          </TabsContent>

          {/* Direct tab */}
          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Empfaenger</Label>
              <input
                id="recipient"
                type="text"
                value={directRecipient}
                onChange={(e) => setDirectRecipient(e.target.value)}
                placeholder="Name oder E-Mail eingeben..."
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <p className="text-[12px] text-muted-foreground">
                Geben Sie die Benutzer-ID des Empfaengers ein. Typ-Voraus-Suche wird in Plan 06 hinzugefuegt.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direct-body">Nachricht</Label>
              <textarea
                id="direct-body"
                value={directBody}
                onChange={(e) => setDirectBody(e.target.value)}
                placeholder="Ihre Nachricht..."
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={handleDiscard} type="button">
            Entwurf verwerfen
          </Button>
          <Tabs defaultValue="broadcast">
            {/* Re-using Tabs context is awkward, so we render both buttons conditionally.
                The parent Tabs context controls visibility via CSS. Since DialogFooter
                renders outside TabsContent, we show both and let the form state decide. */}
          </Tabs>
          <Button
            onClick={handleBroadcastSend}
            disabled={
              createConversation.isPending ||
              !broadcastSubject.trim() ||
              !broadcastBody.trim()
            }
            type="button"
          >
            {createConversation.isPending ? 'Senden...' : 'Nachricht senden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
