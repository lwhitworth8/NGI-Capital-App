export async function spFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export type PublicProject = {
  id: number; project_name: string; client_name: string; summary: string;
  hero_image_url?: string; tags?: string[]; partner_badges?: string[]; backer_badges?: string[];
  start_date?: string; allow_applications?: number; coffeechat_calendly?: string;
}

