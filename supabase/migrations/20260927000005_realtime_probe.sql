-- Los ajustes públicos también se emiten por Realtime. Además de avisar si
-- cambia el modo demo, sirven de "sonda": los scripts de pruebas escriben aquí
-- y esperan el aviso para saber que Realtime ha procesado todo lo anterior.
alter publication supabase_realtime add table public.app_settings;
