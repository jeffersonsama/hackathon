-- Trigger: when a classroom is created, auto-create a linked discussion group
CREATE OR REPLACE FUNCTION public.auto_create_class_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_id uuid;
BEGIN
  INSERT INTO groups (name, description, is_public, created_by, class_id)
  VALUES (
    'Discussion — ' || NEW.name,
    'Groupe de discussion de la classe ' || NEW.name,
    false,
    NEW.created_by,
    NEW.id
  )
  RETURNING id INTO _group_id;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (_group_id, NEW.created_by, 'admin');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_class_group ON classrooms;
CREATE TRIGGER trg_auto_create_class_group
  AFTER INSERT ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_class_group();

-- When a student joins a classroom, auto-add them to the linked group
CREATE OR REPLACE FUNCTION public.auto_join_class_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_id uuid;
BEGIN
  SELECT id INTO _group_id FROM groups WHERE class_id = NEW.classroom_id LIMIT 1;
  IF _group_id IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (_group_id, NEW.user_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_join_class_group ON classroom_members;
CREATE TRIGGER trg_auto_join_class_group
  AFTER INSERT ON classroom_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_join_class_group();