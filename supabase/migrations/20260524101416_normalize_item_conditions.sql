update public.items
set condition = case
  when lower(trim(condition)) = 'new' then 'New'
  when lower(trim(condition)) = 'like new' then 'Like new'
  when lower(trim(condition)) in ('good', 'very good') then 'Good'
  when lower(trim(condition)) in ('okay', 'ok', 'fair', 'used') then 'Okay'
  when lower(trim(condition)) = 'poor' then 'Poor'
  else 'Okay'
end
where condition is distinct from case
  when lower(trim(condition)) = 'new' then 'New'
  when lower(trim(condition)) = 'like new' then 'Like new'
  when lower(trim(condition)) in ('good', 'very good') then 'Good'
  when lower(trim(condition)) in ('okay', 'ok', 'fair', 'used') then 'Okay'
  when lower(trim(condition)) = 'poor' then 'Poor'
  else 'Okay'
end;
