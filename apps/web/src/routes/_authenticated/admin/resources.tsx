import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResourceList } from '@/components/rooms/ResourceList';
import {
  useResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from '@/hooks/useResources';
import { useSchoolContext } from '@/stores/school-context-store';
import type { ResourceDto } from '@schoolflow/shared';

export const Route = createFileRoute('/_authenticated/admin/resources')({
  component: ResourcesPage,
});

/** Available resource types */
const RESOURCE_TYPES = [
  { value: 'Tablet-Wagen', label: 'Tablet-Wagen' },
  { value: 'Laborgeraet', label: 'Laborgeraet' },
  { value: 'Beamer', label: 'Beamer' },
  { value: 'Sonstiges', label: 'Sonstiges' },
] as const;

interface ResourceFormState {
  name: string;
  resourceType: string;
  quantity: string;
  description: string;
}

const EMPTY_FORM: ResourceFormState = {
  name: '',
  resourceType: 'Sonstiges',
  quantity: '1',
  description: '',
};

function ResourcesPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceDto | null>(
    null,
  );
  const [form, setForm] = useState<ResourceFormState>(EMPTY_FORM);

  // Data fetching
  const { data: resources = [], isLoading, isError } = useResources(schoolId);

  // Mutations
  const createResource = useCreateResource(schoolId);
  const updateResource = useUpdateResource(schoolId);
  const deleteResource = useDeleteResource(schoolId);

  // Open add dialog
  function handleAdd() {
    setEditingResource(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  // Open edit dialog
  function handleEdit(resource: ResourceDto) {
    setEditingResource(resource);
    setForm({
      name: resource.name,
      resourceType: resource.resourceType,
      quantity: String(resource.quantity),
      description: resource.description ?? '',
    });
    setDialogOpen(true);
  }

  // Handle delete
  function handleDelete(resource: ResourceDto) {
    deleteResource.mutate(resource.id);
  }

  // Handle form submission
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dto = {
      name: form.name.trim(),
      resourceType: form.resourceType,
      quantity: Number(form.quantity) || 1,
      description: form.description.trim() || undefined,
    };

    if (editingResource) {
      updateResource.mutate(
        { id: editingResource.id, ...dto },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingResource(null);
            setForm(EMPTY_FORM);
          },
        },
      );
    } else {
      createResource.mutate(dto, {
        onSuccess: () => {
          setDialogOpen(false);
          setForm(EMPTY_FORM);
        },
      });
    }
  }

  // Close dialog
  function handleDialogClose() {
    setDialogOpen(false);
    setEditingResource(null);
    setForm(EMPTY_FORM);
  }

  const isSaving = createResource.isPending || updateResource.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2]">
          Ressourcen
        </h1>
        <Button onClick={handleAdd}>Ressource hinzufuegen</Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-muted-foreground">
                Ressourcen werden geladen...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">
              Ressourcen konnten nicht geladen werden. Bitte versuchen Sie es
              spaeter erneut.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && resources.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Keine Ressourcen vorhanden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fuegen Sie Ressourcen hinzu, um Geraete und Material verwalten zu
              koennen.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resource list */}
      {!isLoading && !isError && resources.length > 0 && (
        <ResourceList
          resources={resources}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={deleteResource.isPending}
        />
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingResource
                ? 'Ressource bearbeiten'
                : 'Ressource hinzufuegen'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (required) */}
            <div className="space-y-2">
              <label htmlFor="resource-name" className="text-sm font-semibold">
                Name
              </label>
              <input
                id="resource-name"
                type="text"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Name der Ressource"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={isSaving}
              />
            </div>

            {/* Type field */}
            <div className="space-y-2">
              <label htmlFor="resource-type" className="text-sm font-semibold">
                Typ
              </label>
              <Select
                value={form.resourceType}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, resourceType: value }))
                }
                disabled={isSaving}
              >
                <SelectTrigger id="resource-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity field */}
            <div className="space-y-2">
              <label
                htmlFor="resource-quantity"
                className="text-sm font-semibold"
              >
                Menge
              </label>
              <input
                id="resource-quantity"
                type="number"
                min={1}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                disabled={isSaving}
              />
            </div>

            {/* Description field (optional) */}
            <div className="space-y-2">
              <label
                htmlFor="resource-description"
                className="text-sm font-semibold"
              >
                Beschreibung (optional)
              </label>
              <input
                id="resource-description"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Optionale Beschreibung"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                disabled={isSaving}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDialogClose}
                disabled={isSaving}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSaving || !form.name.trim()}>
                {isSaving ? 'Wird gespeichert...' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
