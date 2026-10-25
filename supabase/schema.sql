create extension if not exists pgcrypto;

create table profiles (id uuid primary key references auth.users on delete cascade,
  username text not null unique, avatar text not null default '🎲', created_at timestamptz default now());
create table rooms (id uuid primary key default gen_random_uuid(),
  root_id uuid not null references profiles, invite_token text not null default encode(gen_random_bytes(18),'hex'),
  settlement_date date not null, max_players int not null default 6, created_at timestamptz default now());
create table room_members (room_id uuid references rooms on delete cascade, user_id uuid references profiles,
  role text not null default 'player' check (role in ('root','player')),
  agreed_at timestamptz, joined_at timestamptz default now(), primary key (room_id,user_id));
create table wallets (room_id uuid, user_id uuid, balance numeric(12,2) not null default 100 check (balance >= 0),
  primary key (room_id,user_id), foreign key (room_id,user_id) references room_members on delete cascade);
create table ledger (id bigserial primary key, room_id uuid not null, user_id uuid not null,
  delta numeric(12,2) not null, reason text not null, game_id uuid, created_at timestamptz default now());
create table game_sessions (id uuid primary key default gen_random_uuid(), room_id uuid not null references rooms on delete cascade,
  game text not null check (game in ('rps','coin','tictactoe','checkers','golden_bowl')),
  players uuid[] not null, stake numeric(12,2) not null check (stake > 0), state jsonb not null default '{}',
  status text not null default 'active' check (status in ('active','done')), winner_id uuid, created_at timestamptz default now());
create table game_secrets (game_id uuid references game_sessions on delete cascade, user_id uuid, bars int[] not null,
  primary key (game_id,user_id));  -- hidden info: NO select policy, only security-definer RPCs read it

alter table profiles enable row level security; alter table rooms enable row level security;
alter table room_members enable row level security; alter table wallets enable row level security;
alter table ledger enable row level security; alter table game_sessions enable row level security;
alter table game_secrets enable row level security;

create function is_member(r uuid) returns boolean language sql security definer stable as
$$ select exists(select 1 from room_members where room_id=r and user_id=auth.uid()) $$;

create policy "own profile" on profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "see roommates" on profiles for select using (exists(select 1 from room_members a join room_members b
  on a.room_id=b.room_id where a.user_id=auth.uid() and b.user_id=profiles.id));
create policy "members read room" on rooms for select using (is_member(id));
create policy "members read members" on room_members for select using (is_member(room_id));
create policy "members read wallets" on wallets for select using (is_member(room_id));
create policy "members read ledger" on ledger for select using (is_member(room_id));
create policy "members read games" on game_sessions for select using (is_member(room_id));
-- No insert/update policies: all writes go through the RPCs below.

create function create_room(p_settlement date) returns rooms language plpgsql security definer as $$
declare r rooms; begin
  insert into rooms(root_id,settlement_date) values (auth.uid(),p_settlement) returning * into r;
  insert into room_members(room_id,user_id,role,agreed_at) values (r.id,auth.uid(),'root',now());
  insert into wallets(room_id,user_id) values (r.id,auth.uid());
  return r; end $$;

create function join_room(p_room uuid, p_token text) returns void language plpgsql security definer as $$
declare r rooms; begin
  select * into r from rooms where id=p_room for update;          -- row lock serializes concurrent joins
  if not found or r.invite_token <> p_token then raise exception 'Invalid invite'; end if;
  if exists(select 1 from room_members where room_id=p_room and user_id=auth.uid()) then return; end if;
  if (select count(*) from room_members where room_id=p_room) >= r.max_players then raise exception 'Room is full (6 max)'; end if;
  insert into room_members(room_id,user_id,agreed_at) values (p_room,auth.uid(),now());  -- call only after terms accepted
  insert into wallets(room_id,user_id) values (p_room,auth.uid()); end $$;

create function _settle(p_game uuid, p_winner uuid) returns void language plpgsql security definer as $$
declare g game_sessions; n int; begin
  select * into g from game_sessions where id=p_game for update;
  if g.status='done' then return; end if;
  n := array_length(g.players,1);
  if p_winner is not null then
    update wallets set balance=balance-g.stake where room_id=g.room_id and user_id=any(g.players) and user_id<>p_winner;
    update wallets set balance=balance+g.stake*(n-1) where room_id=g.room_id and user_id=p_winner;
    insert into ledger(room_id,user_id,delta,reason,game_id)
      select g.room_id,u,case when u=p_winner then g.stake*(n-1) else -g.stake end,g.game,g.id from unnest(g.players) u;
  end if;
  update game_sessions set status='done', winner_id=p_winner where id=p_game; end $$;
revoke all on function _settle from public, anon, authenticated;

create function start_game(p_room uuid, p_game text, p_players uuid[], p_stake numeric) returns uuid
language plpgsql security definer as $$
declare gid uuid; st jsonb; u uuid; begin
  if not is_member(p_room) or not (auth.uid()=any(p_players)) then raise exception 'Not allowed'; end if;
  if exists(select 1 from wallets w where w.room_id=p_room and w.user_id=any(p_players) and w.balance<p_stake)
    then raise exception 'Insufficient Steve Dollars'; end if;
  st := case p_game
    when 'tictactoe' then jsonb_build_object('board',to_jsonb(array_fill(''::text,array[9])),'turn',p_players[1],
         'marks',jsonb_build_object(p_players[1]::text,'X',p_players[2]::text,'O'))
    else jsonb_build_object('turn',p_players[1],'shots','{}'::jsonb,'hits','{}'::jsonb) end;
  insert into game_sessions(room_id,game,players,stake,state) values (p_room,p_game,p_players,p_stake,st) returning id into gid;
  if p_game='golden_bowl' then
    foreach u in array p_players loop  -- 5 hidden gold bars in each 6x6 bowl
      insert into game_secrets select gid,u,array(select c from generate_series(0,35) c order by random() limit 5);
    end loop; end if;
  return gid; end $$;

create function ttt_move(p_game uuid, p_cell int) returns jsonb language plpgsql security definer as $$
declare g game_sessions; b jsonb; m text; w uuid; nxt uuid;
  lines int[] := array[0,1,2,3,4,5,6,7,8,0,3,6,1,4,7,2,5,8,0,4,8,2,4,6]; i int; begin
  select * into g from game_sessions where id=p_game for update;
  if g.status<>'active' or g.state->>'turn'<>auth.uid()::text or p_cell not between 0 and 8
     or g.state->'board'->>p_cell<>'' then raise exception 'Illegal move'; end if;
  m := g.state->'marks'->>(auth.uid()::text);
  b := jsonb_set(g.state->'board',array[p_cell::text],to_jsonb(m));
  for i in 0..7 loop
    if b->>lines[i*3+1]=m and b->>lines[i*3+2]=m and b->>lines[i*3+3]=m then w := auth.uid(); end if; end loop;
  select u into nxt from unnest(g.players) u where u<>auth.uid();
  update game_sessions set state=jsonb_build_object('board',b,'turn',nxt,'marks',g.state->'marks') where id=p_game;
  if w is not null or not exists(select 1 from jsonb_array_elements_text(b) e where e='') then perform _settle(p_game,w); end if;
  return b; end $$;

create function golden_shot(p_game uuid, p_cell int) returns jsonb language plpgsql security definer as $$
declare g game_sessions; me text := auth.uid()::text; opp uuid; bars int[]; shots jsonb; hits jsonb; nh int[]; begin
  select * into g from game_sessions where id=p_game for update;
  if g.status<>'active' or g.state->>'turn'<>me or p_cell not between 0 and 35 then raise exception 'Illegal shot'; end if;
  shots := coalesce(g.state->'shots'->me,'[]'); hits := coalesce(g.state->'hits'->me,'[]');
  if shots @> to_jsonb(p_cell) then raise exception 'Already called'; end if;
  select u into opp from unnest(g.players) u where u<>auth.uid();
  select s.bars into bars from game_secrets s where game_id=p_game and user_id=opp;
  shots := shots || to_jsonb(p_cell);
  if p_cell = any(bars) then hits := hits || to_jsonb(p_cell); end if;
  select array_agg(e::int) into nh from jsonb_array_elements_text(hits) e;
  update game_sessions set state=jsonb_build_object('turn',opp,
    'shots',jsonb_set(g.state->'shots',array[me],shots,true),'hits',jsonb_set(g.state->'hits',array[me],hits,true)) where id=p_game;
  if nh @> bars then perform _settle(p_game,auth.uid()); end if;
  return jsonb_build_object('hit',p_cell=any(bars)); end $$;

grant execute on function create_room, join_room, start_game, ttt_move, golden_shot to authenticated;
alter publication supabase_realtime add table game_sessions, wallets, room_members, ledger;
