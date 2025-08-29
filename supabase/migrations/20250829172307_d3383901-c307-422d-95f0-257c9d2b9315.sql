-- Create some test notifications to show the red bell working
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user (any authenticated user)
    SELECT auth.uid() INTO test_user_id;
    
    -- If we can't get current user, try to get any user from profiles
    IF test_user_id IS NULL THEN
        SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
    END IF;
    
    -- Only proceed if we have a user ID
    IF test_user_id IS NOT NULL THEN
        -- Create test notifications (unread)
        INSERT INTO public.notifications (user_id, type, title, message, data, is_read) VALUES
        (test_user_id, 'job_match', 'Новый заказ рядом!', 'Найден подходящий заказ по уборке в 2 км от вас', '{"distance": 2, "job_type": "cleaning"}', FALSE),
        (test_user_id, 'message', 'Новое сообщение', 'Клиент отправил вам сообщение по заказу', '{"sender": "Александр К."}', FALSE),
        (test_user_id, 'price_proposal', 'Предложение цены', 'Получено новое предложение цены за работу', '{"amount": 150}', FALSE);
    END IF;
END
$$;