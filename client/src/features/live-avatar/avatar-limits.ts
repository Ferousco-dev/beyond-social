export const MAX_CUSTOM_AVATARS = 5;

export function hasReachedAvatarLimit(count: number): boolean {
  return count >= MAX_CUSTOM_AVATARS;
}
