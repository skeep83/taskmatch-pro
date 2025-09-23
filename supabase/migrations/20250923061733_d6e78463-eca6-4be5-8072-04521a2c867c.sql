-- Добавляем все основные категории услуг для ServiceHub платформы

-- Домашний ремонт и строительство
INSERT INTO categories (key, label_ru, label_ro) VALUES 
('plumbing', 'Сантехника', 'Instalații sanitare'),
('heating', 'Отопление и кондиционирование', 'Încălzire și climatizare'),
('roofing', 'Кровельные работы', 'Lucrări de acoperiș'),
('flooring', 'Напольные покрытия', 'Pardoseli'),
('tiling', 'Плиточные работы', 'Lucrări de faianță'),
('windows_doors', 'Окна и двери', 'Ferestre și uși'),
('insulation', 'Утепление и изоляция', 'Izolație'),
('drywall', 'Гипсокартон', 'Rigips'),
('masonry', 'Каменные работы', 'Lucrări de zidărie'),
('welding', 'Сварочные работы', 'Lucrări de sudură'),
('carpentry', 'Столярные работы', 'Tâmplărie'),
('furniture_assembly', 'Сборка мебели', 'Asamblare mobilier'),
('home_renovation', 'Ремонт квартир', 'Renovări apartamente'),

-- Клининг и уборка
('cleaning_home', 'Уборка дома', 'Curățenie casă'),
('cleaning_office', 'Уборка офиса', 'Curățenie birou'),
('cleaning_windows', 'Мытье окон', 'Curățenie ferestre'),
('cleaning_post_construction', 'Послестроительная уборка', 'Curățenie post-construcție'),
('cleaning_deep', 'Генеральная уборка', 'Curățenie generală'),
('carpet_cleaning', 'Химчистка ковров', 'Curățare covoare'),
('upholstery_cleaning', 'Химчистка мебели', 'Curățare tapițerie'),

-- Грузоперевозки и переезды уже есть moving

-- Садоводство и ландшафт
('gardening', 'Садоводство', 'Grădinărit'),
('lawn_care', 'Уход за газоном', 'Îngrijire gazon'),
('tree_services', 'Спил деревьев', 'Tăiere copaci'),
('landscaping', 'Ландшафтный дизайн', 'Design peisagistic'),
('irrigation', 'Системы полива', 'Sisteme de irigații'),

-- Красота и здоровье
('beauty_hair', 'Парикмахерские услуги', 'Servicii frizerie'),
('beauty_nails', 'Маникюр/педикюр', 'Manichiură/pedichiură'),
('beauty_massage', 'Массаж', 'Masaj'),
('beauty_makeup', 'Макияж', 'Machiaj'),
('beauty_cosmetology', 'Косметология', 'Cosmetologie'),
('fitness_personal', 'Персональный тренер', 'Antrenor personal'),

-- Автомобильные услуги
('auto_repair', 'Ремонт автомобилей', 'Reparații auto'),
('auto_maintenance', 'ТО автомобилей', 'Întreținere auto'),
('auto_detailing', 'Детейлинг автомобилей', 'Detailing auto'),
('auto_towing', 'Эвакуатор', 'Evacuator'),
('auto_tire_service', 'Шиномонтаж', 'Montaj anvelope'),

-- Техника и электроника уже есть electrical_work, добавим смежные
('appliance_repair', 'Ремонт бытовой техники', 'Reparații electronice'),
('computer_repair', 'Ремонт компьютеров', 'Reparații calculatoare'),
('phone_repair', 'Ремонт телефонов', 'Reparații telefoane'),
('tv_installation', 'Установка телевизоров', 'Instalare televizoare'),
('smart_home', 'Умный дом', 'Casă inteligentă'),

-- Обучение и репетиторство
('tutoring_math', 'Репетитор математики', 'Meditații matematică'),
('tutoring_languages', 'Изучение языков', 'Învățare limbi străine'),
('tutoring_music', 'Уроки музыки', 'Lecții de muzică'),
('tutoring_driving', 'Автошкола', 'Școală de șoferi'),
('tutoring_computer', 'Компьютерная грамотность', 'Alfabetizare digitală'),

-- Фото и видео
('photography_events', 'Фотосъемка мероприятий', 'Fotografie evenimente'),
('photography_portrait', 'Портретная съемка', 'Fotografie portret'),
('videography', 'Видеосъемка', 'Videografie'),
('photo_editing', 'Обработка фото', 'Editare foto'),

-- Мероприятия и праздники
('event_planning', 'Организация мероприятий', 'Organizare evenimente'),
('catering', 'Кейтеринг', 'Catering'),
('entertainment_dj', 'Диджей', 'DJ'),
('entertainment_music', 'Музыканты', 'Muzicieni'),
('decoration', 'Декорирование', 'Decorațiuni'),

-- Юридические и деловые услуги
('legal_consultation', 'Юридические консультации', 'Consultanță juridică'),
('accounting', 'Бухгалтерские услуги', 'Servicii contabile'),
('translation', 'Переводы', 'Traduceri'),
('notary', 'Нотариальные услуги', 'Servicii notariale'),

-- Дизайн и творчество
('design_interior', 'Дизайн интерьера', 'Design interior'),
('design_graphic', 'Графический дизайн', 'Design grafic'),
('design_web', 'Веб-дизайн', 'Design web'),
('design_logo', 'Разработка логотипов', 'Design logo'),

-- Доставка и курьерские услуги
('delivery_food', 'Доставка еды', 'Livrare mâncare'),
('delivery_packages', 'Курьерские услуги', 'Servicii curier'),
('delivery_grocery', 'Доставка продуктов', 'Livrare cumpărături'),

-- Безопасность
('security_installation', 'Установка сигнализации', 'Instalare alarmă'),
('security_cameras', 'Видеонаблюдение', 'Supraveghere video'),
('locksmith', 'Слесарные работы', 'Servicii lăcătușerie'),

-- Здоровье животных
('pet_grooming', 'Груминг животных', 'Îngrijire animale'),
('pet_sitting', 'Передержка животных', 'Îngrijire temporară animale'),
('pet_training', 'Дрессировка', 'Dresaj animale'),
('veterinary_home', 'Ветеринар на дом', 'Veterinar la domiciliu'),

-- Социальные услуги
('elderly_care', 'Уход за пожилыми', 'Îngrijire vârstnici'),
('childcare', 'Присмотр за детьми', 'Îngrijire copii'),
('housekeeping', 'Домработница', 'Menajeră'),
('personal_assistant', 'Личный помощник', 'Asistent personal'),

-- Спорт и фитнес
('sports_coaching', 'Спортивные тренировки', 'Antrenament sportiv'),
('yoga_pilates', 'Йога и пилатес', 'Yoga și pilates'),
('swimming_instructor', 'Инструктор плавания', 'Instructor înot'),

-- Прочие услуги
('tailoring', 'Ателье и ремонт одежды', 'Croitorie și reparații haine'),
('shoe_repair', 'Ремонт обуви', 'Reparații încălțăminte'),
('key_cutting', 'Изготовление ключей', 'Duplicare chei'),
('equipment_rental', 'Аренда инструментов', 'Închiriere unelte'),
('waste_removal', 'Вывоз мусора', 'Evacuare deșeuri'),
('snow_removal', 'Уборка снега', 'Curățare zăpadă')

ON CONFLICT (key) DO NOTHING;