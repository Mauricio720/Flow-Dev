ALTER TABLE task_publication_attempts
  DROP CONSTRAINT task_publication_attempts_ready_assignment_choice_check,
  DROP CONSTRAINT task_publication_attempts_ready_assignment_check,
  DROP COLUMN ready_assignment,
  DROP COLUMN assign_to_self;
