
CREATE OR REPLACE FUNCTION validate_conversation_type() RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('direct', 'group') THEN RAISE EXCEPTION 'Invalid conversation type: %', NEW.type; END IF;
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION validate_message_type() RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.message_type NOT IN ('text', 'file', 'image', 'video', 'audio_note', 'call_log', 'system') THEN
    RAISE EXCEPTION 'Invalid message_type: %', NEW.message_type; END IF;
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION validate_presence_status() RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('online', 'away', 'busy', 'offline') THEN RAISE EXCEPTION 'Invalid presence status'; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION validate_call_session() RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.call_type NOT IN ('audio', 'video') THEN RAISE EXCEPTION 'Invalid call_type'; END IF;
  IF NEW.status NOT IN ('ringing', 'active', 'ended', 'missed', 'declined') THEN RAISE EXCEPTION 'Invalid call status'; END IF;
  RETURN NEW;
END;$$;
