'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type ChatState = { success?: boolean; error?: 'signIn' | 'notMember' | 'empty' | 'generic' };

/**
 * Posts to a group trip's chat. The database decides membership (the guide,
 * travellers with a live booking, admins) and refuses anyone else.
 */
export async function postDepartureMessage(departureId: string, slug: string, _prev: ChatState, fd: FormData): Promise<ChatState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signIn' };
  const body = String(fd.get('body') ?? '').trim().slice(0, 2000);
  if (!body) return { error: 'empty' };
  const { data: member } = await supabase.rpc('is_departure_member', { p_departure: departureId });
  if (!member) return { error: 'notMember' };

  const [{ data: profile }, { data: dep }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('group_departures').select('business_id, businesses!inner (owner_id, name)').eq('id', departureId).maybeSingle(),
  ]);
  const biz = dep ? ((Array.isArray(dep.businesses) ? dep.businesses[0] : dep.businesses) as { owner_id: string | null; name: string }) : null;
  const isGuide = biz?.owner_id === user.id;
  const { error } = await supabase.from('departure_messages').insert({
    departure_id: departureId,
    author_id: user.id,
    author_name: isGuide ? biz!.name : profile?.full_name?.trim() || (user.email ?? 'Traveller').split('@')[0],
    is_guide: isGuide,
    body,
  });
  if (error) return { error: 'generic' };
  revalidatePath(`/group-trips/${slug}/chat`);
  return { success: true };
}
