-- Datos de ejemplo para desarrollo local (`supabase db reset` los aplica).
-- NO se usa en producción.

-- Franjas de las próximas semanas (la admin real las crea desde /admin).
insert into public.availability_slots (class_date, start_time, end_time, capacity, notes)
values
  (current_date + 3,  '18:00', '20:00', 6, 'Puntada margarita y nudos franceses'),
  (current_date + 5,  '10:30', '12:30', 6, 'Bordado de iniciales'),
  (current_date + 5,  '15:00', '17:00', 4, 'Grupo reducido — bordado libre'),
  (current_date + 10, '18:00', '20:00', 6, null)
on conflict do nothing;
