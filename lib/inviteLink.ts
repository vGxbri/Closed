/**
 * Enlaces de invitación
 * Generación y normalización de URLs y códigos para unirse a grupos cerrados.
 */

import * as Linking from "expo-linking";

export function normalizeInviteCode(code: string | string[] | undefined): string | null {
  const raw = Array.isArray(code) ? code[0] : code;
  const normalized = raw?.trim().toUpperCase();
  return normalized || null;
}

export function getGroupInviteUrl(inviteCode: string): string {
  const code = normalizeInviteCode(inviteCode);
  if (!code) {
    return Linking.createURL("/join");
  }
  return Linking.createURL(`/join/${encodeURIComponent(code)}`);
}

export function getInviteShareMessage(groupName: string, inviteCode: string): string {
  const code = normalizeInviteCode(inviteCode) ?? inviteCode.trim().toUpperCase();
  const url = getGroupInviteUrl(code);

  return [
    `Únete al grupo "${groupName}" en Closed.`,
    "",
    `Código: ${code}`,
    "",
    "Si tienes la app instalada, abre este enlace:",
    url,
    "",
    "Si el enlace no abre la app, ve a Closed → Unirse a un grupo e introduce el código.",
  ].join("\n");
}
