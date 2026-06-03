-- Seed data para Academias (Gyms)
INSERT INTO public.gyms (name, address, lat, lng, rating, price_range, specialty, emoji)
VALUES 
('Smart Fit - Paulista', 'Av. Paulista, 1000, São Paulo - SP', -23.561414, -46.655881, 4.5, 'R$ 119-149', 'Musculação e Cardio', '🏋️'),
('Bluefit - Consolação', 'Rua da Consolação, 1500, São Paulo - SP', -23.555814, -46.662881, 4.3, 'R$ 99-129', 'Treino Funcional', '💪'),
('Bio Ritmo - Conjunto Nacional', 'Av. Paulista, 2073, São Paulo - SP', -23.558414, -46.660881, 4.8, 'R$ 250-400', 'Premium Fitness', '✨'),
('Academia Gaviões - 24h', 'Rua Augusta, 1200, São Paulo - SP', -23.552414, -46.658881, 4.2, 'R$ 80-110', 'Atendimento 24h', '🦉'),
('Selfit - Bela Vista', 'Rua Treze de Maio, 800, São Paulo - SP', -23.565414, -46.648881, 4.1, 'R$ 89-119', 'Custo-benefício', '⚡');

-- Seed data para Clínicas (Clinics)
INSERT INTO public.clinics (name, address, lat, lng, clinic_type, specialty, phone, emoji)
VALUES 
('UBS Santa Cecília', 'Rua Vitorino Carmilo, 599, São Paulo - SP', -23.535414, -46.650881, 'UBS', 'Clínico Geral', '(11) 3661-0000', '🏥'),
('Hospital das Clínicas', 'Av. Dr. Enéas Carvalho de Aguiar, 255, São Paulo - SP', -23.556414, -46.668881, 'Hospital', 'Alta Complexidade', '(11) 2661-0000', '🏥'),
('AMA Especialidades - Sé', 'Rua Frederico Alvarenga, 259, São Paulo - SP', -23.550414, -46.630881, 'AMA', 'Especialidades', '(11) 3101-0000', '🏥'),
('Centro de Saúde Pinheiros', 'Av. Frederico Hermann Júnior, 590, São Paulo - SP', -23.560414, -46.702881, 'UBS', 'Saúde da Família', '(11) 3031-0000', '🏥'),
('Hospital Sírio-Libanês', 'Rua Dona Adma Jafet, 91, São Paulo - SP', -23.557414, -46.655881, 'Hospital', 'Particular', '(11) 3394-0000', '🏥');
