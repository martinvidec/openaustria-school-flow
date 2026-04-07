/**
 * Circular avatar with initials derived from a user's display name.
 * Background color is deterministically chosen from userId hash (8 muted colors).
 * Per UI-SPEC: sm=24px, md=32px, lg=40px.
 */
export function UserInitialsAvatar({
  name,
  userId,
  size = 'md',
}: {
  name: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-red-100 text-red-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
  ];

  const colorIndex =
    [...userId].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  const sizeClass = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  return (
    <div
      className={`${sizeClass} ${colors[colorIndex]} rounded-full flex items-center justify-center font-semibold shrink-0`}
    >
      {initials}
    </div>
  );
}
