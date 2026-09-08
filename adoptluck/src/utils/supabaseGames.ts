import { CoinflipGame } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type GameRow = {
  id: string;
  game: CoinflipGame;
  status: CoinflipGame['status'];
  created_at: string;
};

export async function loadRemoteGames(): Promise<CoinflipGame[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('coinflip_games')
    .select('id, game, status, created_at')
    .neq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Failed to load coinflips:', error);
    return null;
  }

  return (data as GameRow[]).map((row) => ({
    ...row.game,
    id: row.id,
    status: row.status,
  }));
}

export async function createRemoteGame(game: CoinflipGame): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase.from('coinflip_games').upsert({
    id: game.id,
    game,
    status: game.status,
    created_at: new Date(game.createdAt).toISOString(),
  });

  if (error) {
    console.error('[Supabase] Failed to create coinflip:', error);
    return false;
  }
  return true;
}

export async function updateRemoteGame(game: CoinflipGame): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from('coinflip_games')
    .update({ game, status: game.status })
    .eq('id', game.id);

  if (error) {
    console.error('[Supabase] Failed to update coinflip:', error);
    return false;
  }
  return true;
}

export async function deleteRemoteGame(gameId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from('coinflip_games')
    .delete()
    .eq('id', gameId);

  if (error) {
    console.error('[Supabase] Failed to delete coinflip:', error);
    return false;
  }
  return true;
}

export function subscribeToRemoteGames(
  onChange: (game: CoinflipGame | null, event: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel('bankro-coinflips')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'coinflip_games' },
      (payload) => {
        const row = payload.new as Partial<GameRow>;
        const old = payload.old as Partial<GameRow>;

        if (payload.eventType === 'DELETE') {
          onChange(old?.game ?? null, 'DELETE');
          return;
        }

        if (!row?.game) return;
        onChange(
          {
            ...(row.game as CoinflipGame),
            id: row.id!,
            status: row.status!,
          },
          payload.eventType as 'INSERT' | 'UPDATE'
        );
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[Supabase] Realtime channel error for coinflips.');
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
