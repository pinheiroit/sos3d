export function canManageService(roles: readonly string[]) {
  return roles.includes("admin") || roles.includes("seller");
}