
INSERT INTO storage.buckets (id, name, public) VALUES ('messages-files', 'messages-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read messages-files" ON storage.objects FOR SELECT USING (bucket_id = 'messages-files');
CREATE POLICY "Auth users upload messages-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'messages-files' AND auth.role() = 'authenticated');
CREATE POLICY "Users delete own messages-files" ON storage.objects FOR DELETE USING (bucket_id = 'messages-files' AND auth.uid()::text = (storage.foldername(name))[1]);
