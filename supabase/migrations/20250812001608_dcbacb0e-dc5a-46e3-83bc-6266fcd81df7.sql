-- RE-RUN: Create policies using correct catalog column policyname

-- Categories/pricing policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_read_all') THEN
    CREATE POLICY categories_read_all ON public.categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_admin_ins') THEN
    CREATE POLICY categories_admin_ins ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_admin_upd') THEN
    CREATE POLICY categories_admin_upd ON public.categories FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_admin_del') THEN
    CREATE POLICY categories_admin_del ON public.categories FOR DELETE USING (public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_read_all') THEN
    CREATE POLICY pricing_read_all ON public.pricing_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_admin_ins') THEN
    CREATE POLICY pricing_admin_ins ON public.pricing_templates FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_admin_upd') THEN
    CREATE POLICY pricing_admin_upd ON public.pricing_templates FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_admin_del') THEN
    CREATE POLICY pricing_admin_del ON public.pricing_templates FOR DELETE USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Jobs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_select_own_or_assigned_or_admin') THEN
    CREATE POLICY jobs_select_own_or_assigned_or_admin ON public.jobs FOR SELECT USING (
      client_id = auth.uid() OR pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_insert_client_only') THEN
    CREATE POLICY jobs_insert_client_only ON public.jobs FOR INSERT WITH CHECK (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_update_own_or_assigned_or_admin') THEN
    CREATE POLICY jobs_update_own_or_assigned_or_admin ON public.jobs FOR UPDATE USING (
      client_id = auth.uid() OR pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
END $$;

-- Job photos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='job_photos_select_by_job_access') THEN
    CREATE POLICY job_photos_select_by_job_access ON public.job_photos FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='job_photos_insert_by_owner') THEN
    CREATE POLICY job_photos_insert_by_owner ON public.job_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.pro_id = auth.uid()))
    );
  END IF;
END $$;

-- Tenders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenders_select_open_or_owner_or_admin') THEN
    CREATE POLICY tenders_select_open_or_owner_or_admin ON public.tenders FOR SELECT USING (
      status = 'open' OR client_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenders_insert_owner') THEN
    CREATE POLICY tenders_insert_owner ON public.tenders FOR INSERT WITH CHECK (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenders_update_owner_or_admin') THEN
    CREATE POLICY tenders_update_owner_or_admin ON public.tenders FOR UPDATE USING (
      client_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
END $$;

-- Bids
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='bids_select_pro_or_tender_owner_or_admin') THEN
    CREATE POLICY bids_select_pro_or_tender_owner_or_admin ON public.bids FOR SELECT USING (
      pro_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (
        SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.client_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='bids_insert_pro_only') THEN
    CREATE POLICY bids_insert_pro_only ON public.bids FOR INSERT WITH CHECK (pro_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='bids_update_pro_or_admin') THEN
    CREATE POLICY bids_update_pro_or_admin ON public.bids FOR UPDATE USING (pro_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Chats
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chats_select_participants_or_admin') THEN
    CREATE POLICY chats_select_participants_or_admin ON public.chats FOR SELECT USING (
      client_id = auth.uid() OR professional_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chats_insert_participants_only') THEN
    CREATE POLICY chats_insert_participants_only ON public.chats FOR INSERT WITH CHECK (
      client_id = auth.uid() OR professional_id = auth.uid()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chats_update_participants_or_admin') THEN
    CREATE POLICY chats_update_participants_or_admin ON public.chats FOR UPDATE USING (
      client_id = auth.uid() OR professional_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
END $$;

-- Chat messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chat_messages_select_participants_or_admin') THEN
    CREATE POLICY chat_messages_select_participants_or_admin ON public.chat_messages FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND (c.client_id = auth.uid() OR c.professional_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chat_messages_insert_sender_participant') THEN
    CREATE POLICY chat_messages_insert_sender_participant ON public.chat_messages FOR INSERT WITH CHECK (
      sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND (c.client_id = auth.uid() OR c.professional_id = auth.uid()))
    );
  END IF;
END $$;

-- Wallets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wallets_select_own_or_admin') THEN
    CREATE POLICY wallets_select_own_or_admin ON public.wallets FOR SELECT USING (pro_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wallets_insert_admin') THEN
    CREATE POLICY wallets_insert_admin ON public.wallets FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wallets_update_admin') THEN
    CREATE POLICY wallets_update_admin ON public.wallets FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Transactions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='transactions_select_own_or_admin') THEN
    CREATE POLICY transactions_select_own_or_admin ON public.transactions FOR SELECT USING (pro_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='transactions_insert_admin') THEN
    CREATE POLICY transactions_insert_admin ON public.transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Escrows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='escrows_select_parties_or_admin') THEN
    CREATE POLICY escrows_select_parties_or_admin ON public.escrows FOR SELECT USING (
      client_id = auth.uid() OR pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='escrows_insert_admin') THEN
    CREATE POLICY escrows_insert_admin ON public.escrows FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='escrows_update_admin') THEN
    CREATE POLICY escrows_update_admin ON public.escrows FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- KYC
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='kyc_select_own_or_admin') THEN
    CREATE POLICY kyc_select_own_or_admin ON public.kyc_documents FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='kyc_insert_own') THEN
    CREATE POLICY kyc_insert_own ON public.kyc_documents FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='kyc_update_admin') THEN
    CREATE POLICY kyc_update_admin ON public.kyc_documents FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Ratings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ratings_select_involved_or_admin') THEN
    CREATE POLICY ratings_select_involved_or_admin ON public.ratings FOR SELECT USING (
      from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ratings_insert_from_user') THEN
    CREATE POLICY ratings_insert_from_user ON public.ratings FOR INSERT WITH CHECK (from_user_id = auth.uid());
  END IF;
END $$;

-- Subscriptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_select_own_or_admin') THEN
    CREATE POLICY subscriptions_select_own_or_admin ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_upsert_any_trusted') THEN
    CREATE POLICY subscriptions_upsert_any_trusted ON public.subscriptions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_update_trusted') THEN
    CREATE POLICY subscriptions_update_trusted ON public.subscriptions FOR UPDATE USING (true);
  END IF;
END $$;

-- Referrals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='referrals_select_referrer_or_referred_or_admin') THEN
    CREATE POLICY referrals_select_referrer_or_referred_or_admin ON public.referrals FOR SELECT USING (
      referrer_id = auth.uid() OR referred_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='referrals_insert_referrer') THEN
    CREATE POLICY referrals_insert_referrer ON public.referrals FOR INSERT WITH CHECK (referrer_id = auth.uid());
  END IF;
END $$;

-- Business
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_accounts_select_owner_or_member_or_admin') THEN
    CREATE POLICY biz_accounts_select_owner_or_member_or_admin ON public.business_accounts FOR SELECT USING (
      owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.business_members bm WHERE bm.business_id = id AND bm.user_id = auth.uid()
      ) OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_accounts_insert_owner_only') THEN
    CREATE POLICY biz_accounts_insert_owner_only ON public.business_accounts FOR INSERT WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_accounts_update_owner_or_admin') THEN
    CREATE POLICY biz_accounts_update_owner_or_admin ON public.business_accounts FOR UPDATE USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_members_select_self_or_admin') THEN
    CREATE POLICY biz_members_select_self_or_admin ON public.business_members FOR SELECT USING (
      user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (
        SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_members_insert_owner_only') THEN
    CREATE POLICY biz_members_insert_owner_only ON public.business_members FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_id = auth.uid())
    );
  END IF;
END $$;

-- STORAGE policies re-run
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_kyc_read_own_or_admin') THEN
    CREATE POLICY storage_kyc_read_own_or_admin ON storage.objects FOR SELECT USING (
      (bucket_id = 'kyc') AND (
        public.has_role(auth.uid(),'admin') OR auth.uid()::text = (storage.foldername(name))[1]
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_kyc_write_own') THEN
    CREATE POLICY storage_kyc_write_own ON storage.objects FOR INSERT WITH CHECK (
      (bucket_id = 'kyc') AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_evidence_read') THEN
    CREATE POLICY storage_evidence_read ON storage.objects FOR SELECT USING (
      bucket_id = 'evidence' AND (
        public.has_role(auth.uid(),'admin') OR EXISTS (
          SELECT 1 FROM public.jobs j WHERE j.id::text = (storage.foldername(name))[1] AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
        )
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_evidence_write') THEN
    CREATE POLICY storage_evidence_write ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'evidence' AND EXISTS (
        SELECT 1 FROM public.jobs j WHERE j.id::text = (storage.foldername(name))[1] AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_chat_read') THEN
    CREATE POLICY storage_chat_read ON storage.objects FOR SELECT USING (
      bucket_id = 'chat' AND (
        public.has_role(auth.uid(),'admin') OR EXISTS (
          SELECT 1 FROM public.chats c WHERE c.id::text = (storage.foldername(name))[1] AND (c.client_id = auth.uid() OR c.professional_id = auth.uid())
        )
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_chat_write') THEN
    CREATE POLICY storage_chat_write ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'chat' AND EXISTS (
        SELECT 1 FROM public.chats c WHERE c.id::text = (storage.foldername(name))[1] AND (c.client_id = auth.uid() OR c.professional_id = auth.uid())
      )
    );
  END IF;
END $$;