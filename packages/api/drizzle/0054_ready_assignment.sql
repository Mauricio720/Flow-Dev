ALTER TABLE task_publication_attempts
  ADD COLUMN assign_to_self boolean NOT NULL DEFAULT false,
  ADD COLUMN ready_assignment text;

ALTER TABLE task_publication_attempts
  ADD CONSTRAINT task_publication_attempts_ready_assignment_check
    CHECK (ready_assignment IS NULL OR ready_assignment IN ('ready', 'not_assigned', 'ready_failed')),
  ADD CONSTRAINT task_publication_attempts_ready_assignment_choice_check
    CHECK (ready_assignment IS NULL OR assign_to_self);
