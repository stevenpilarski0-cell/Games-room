-- Lets an invitee (not yet a member) see the settlement date + seat count before joining.
create function room_preview(p_room uuid, p_token text) returns jsonb language sql security definer stable as $$
  select jsonb_build_object('settlement_date', r.settlement_date, 'max', r.max_players,
    'players', (select count(*) from room_members m where m.room_id = r.id))
  from rooms r where r.id = p_room and r.invite_token = p_token $$;
grant execute on function room_preview to authenticated;
