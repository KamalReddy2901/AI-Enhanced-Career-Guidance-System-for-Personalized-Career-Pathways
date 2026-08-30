-- CareerCase × SIH26044: industry-authored questionnaires for technical and soft-skill evaluation.
-- Questionnaires bind to opportunity/version context, support explicit human publication,
-- preserve immutable published versions after submissions exist, provide deterministic scoring
-- where appropriate, produce bounded assessed evidence with explicit provenance, and enforce
-- tenant isolation. Free-text answers must NOT silently produce high-impact automated suitability/
-- readiness judgments. AI may assist human review/explanation but cannot silently score a candidate
-- for employment. Questionnaire results are context-bound assessed evidence ONLY—never universally
-- verified or permanent mastery claims.

-- Question types supported
create type sih26044.questionnaire_question_type as enum (
  'single_choice',
  'multiple_choice',
  'numeric',
  'text',
  'structured_scenario'
);

-- Questionnaire lifecycle status
create type sih26044.questionnaire_status as enum (
  'draft',
  'published',
  'archived'
);

-- Questionnaires table — stable identity across versions
create table sih26044.questionnaires (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  current_version_id uuid,
  status sih26044.questionnaire_status not null default 'draft',
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Questionnaire versions — immutable after publication + submissions
create table sih26044.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references sih26044.questionnaires(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status sih26044.questionnaire_status not null default 'draft',
  title text not null check (length(btrim(title)) between 1 and 300),
  description text not null check (length(btrim(description)) between 1 and 2000),
  scope_declaration text not null check (scope_declaration in ('opportunity_specific', 'reusable_technical', 'reusable_soft_skill')),
  -- Deterministic scoring configuration (null = no automatic scoring)
  scoring_policy jsonb check (
    scoring_policy is null 
    or (
      jsonb_typeof(scoring_policy) = 'object'
      and scoring_policy ? 'version'
      and scoring_policy ? 'rules'
    )
  ),
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (questionnaire_id, version_number),
  unique (id, questionnaire_id),
  check (
    (status = 'draft' and published_at is null)
    or (status IN ('published', 'archived') and published_at is not null)
  )
);

alter table sih26044.questionnaires
  add constraint questionnaires_current_version_fk
  foreign key (current_version_id, id)
  references sih26044.questionnaire_versions(id, questionnaire_id)
  on delete restrict;

-- Questions within a questionnaire version
create table sih26044.questionnaire_questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references sih26044.questionnaire_versions(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  question_type sih26044.questionnaire_question_type not null,
  question_text text not null check (length(btrim(question_text)) between 1 and 2000),
  -- Choice options (for single_choice/multiple_choice), null for other types
  choice_options jsonb check (
    (question_type IN ('single_choice', 'multiple_choice') 
      and choice_options is not null
      and jsonb_typeof(choice_options) = 'array'
      and jsonb_array_length(choice_options) > 0)
    or (question_type NOT IN ('single_choice', 'multiple_choice') and choice_options is null)
  ),
  -- Numeric constraints (for numeric type)
  numeric_min numeric,
  numeric_max numeric,
  -- Expected skill mapping (optional conservative linkage)
  skill_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(skill_refs) = 'array'),
  -- Deterministic scoring weight (null = not scored, or scoring handled at questionnaire level)
  scoring_weight numeric(5,2) check (scoring_weight is null or scoring_weight >= 0),
  created_at timestamptz not null default now(),
  unique (questionnaire_version_id, ordinal),
  check (
    (question_type = 'numeric' and numeric_min is not null and numeric_max is not null and numeric_max > numeric_min)
    or (question_type != 'numeric' and numeric_min is null and numeric_max is null)
  )
);

-- Questionnaire bindings to opportunities (many-to-many)
create table sih26044.opportunity_questionnaire_assignments (
  id uuid primary key default gen_random_uuid(),
  opportunity_version_id uuid not null references sih26044.opportunity_versions(id) on delete cascade,
  questionnaire_id uuid not null references sih26044.questionnaires(id) on delete restrict,
  required boolean not null default true,
  ordinal integer not null check (ordinal >= 0),
  created_at timestamptz not null default now(),
  unique (opportunity_version_id, questionnaire_id),
  unique (opportunity_version_id, ordinal)
);

-- Student questionnaire submissions
create table sih26044.questionnaire_submissions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references sih26044.questionnaire_versions(id) on delete restrict,
  respondent_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  -- Opportunity context (if bound)
  opportunity_id uuid references sih26044.opportunities(id) on delete restrict,
  opportunity_version_id uuid references sih26044.opportunity_versions(id) on delete restrict,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  -- Deterministic score (if scoring_policy exists and all scoreable questions answered)
  computed_score numeric(6,2) check (computed_score is null or computed_score >= 0),
  score_computed_at timestamptz,
  scoring_policy_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (submitted_at is null and computed_score is null and score_computed_at is null and scoring_policy_version is null)
    or (submitted_at is not null)
  ),
  check (
    (computed_score is null and score_computed_at is null and scoring_policy_version is null)
    or (computed_score is not null and score_computed_at is not null and scoring_policy_version is not null)
  ),
  check (opportunity_id is null or opportunity_version_id is not null),
  unique (questionnaire_version_id, respondent_actor_id, opportunity_id)
);

-- Individual question responses
create table sih26044.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references sih26044.questionnaire_submissions(id) on delete cascade,
  question_id uuid not null references sih26044.questionnaire_questions(id) on delete restrict,
  -- Response value (type depends on question_type)
  response_value jsonb not null check (jsonb_typeof(response_value) IN ('string', 'number', 'array', 'object')),
  -- Deterministic score contribution (if question has scoring_weight)
  response_score numeric(6,2) check (response_score is null or response_score >= 0),
  answered_at timestamptz not null default now(),
  unique (submission_id, question_id)
);

-- RLS Policies

-- Questionnaires: organization members can read their own org's questionnaires
alter table sih26044.questionnaires enable row level security;
create policy questionnaires_org_read on sih26044.questionnaires
  for select using (
    owner_organization_id in (
      select m.organization_id 
      from sih26044.organization_memberships m
      where m.actor_id = sih26044.current_actor_id()
        and m.status = 'active'
    )
  );

-- Questionnaires: authenticated recruiters can create questionnaires
create policy questionnaires_org_insert on sih26044.questionnaires
  for insert with check (
    owner_organization_id in (
      select m.organization_id 
      from sih26044.organization_memberships m
      inner join sih26044.organization_membership_roles mr on mr.membership_id = m.id
      where m.actor_id = sih26044.current_actor_id()
        and m.status = 'active'
        and mr.role in ('institution_admin', 'recruiter')
    )
  );

-- Questionnaires: organization admins/recruiters can update their org's questionnaires
create policy questionnaires_org_update on sih26044.questionnaires
  for update using (
    owner_organization_id in (
      select m.organization_id 
      from sih26044.organization_memberships m
      inner join sih26044.organization_membership_roles mr on mr.membership_id = m.id
      where m.actor_id = sih26044.current_actor_id()
        and m.status = 'active'
        and mr.role in ('institution_admin', 'recruiter')
    )
  );

-- Questionnaire versions: read by org members + students for published versions
alter table sih26044.questionnaire_versions enable row level security;
create policy questionnaire_versions_read on sih26044.questionnaire_versions
  for select using (
    -- Org members see all versions
    questionnaire_id in (
      select q.id from sih26044.questionnaires q
      where q.owner_organization_id in (
        select organization_id from sih26044.organization_memberships
        where actor_id = sih26044.current_actor_id()
          and status = 'active'
      )
    )
    or
    -- Students see only published versions assigned to opportunities
    (status = 'published' and id in (
      select qa.questionnaire_id from sih26044.opportunity_questionnaire_assignments qa
      inner join sih26044.opportunity_versions ov on ov.id = qa.opportunity_version_id
      where ov.status = 'published'
    ))
  );

-- Questionnaire versions: insert/update by org recruiters/admins
create policy questionnaire_versions_org_write on sih26044.questionnaire_versions
  for all using (
    questionnaire_id in (
      select q.id from sih26044.questionnaires q
      inner join sih26044.organization_memberships m on m.organization_id = q.owner_organization_id
      inner join sih26044.organization_membership_roles mr on mr.membership_id = m.id
      where m.actor_id = sih26044.current_actor_id()
        and m.status = 'active'
        and mr.role in ('institution_admin', 'recruiter')
    )
  );

-- Questions: read follows version read
alter table sih26044.questionnaire_questions enable row level security;
create policy questionnaire_questions_read on sih26044.questionnaire_questions
  for select using (
    questionnaire_version_id in (
      select id from sih26044.questionnaire_versions
      -- RLS policy enforces visibility
    )
  );

-- Questions: write by org members who can write the version
create policy questionnaire_questions_write on sih26044.questionnaire_questions
  for all using (
    questionnaire_version_id in (
      select qv.id from sih26044.questionnaire_versions qv
      inner join sih26044.questionnaires q on q.id = qv.questionnaire_id
      inner join sih26044.organization_memberships m on m.organization_id = q.owner_organization_id
      inner join sih26044.organization_membership_roles mr on mr.membership_id = m.id
      where m.actor_id = sih26044.current_actor_id()
        and m.status = 'active'
        and mr.role in ('institution_admin', 'recruiter')
    )
  );

-- Opportunity questionnaire assignments: read follows opportunity read
alter table sih26044.opportunity_questionnaire_assignments enable row level security;
create policy opportunity_questionnaire_read on sih26044.opportunity_questionnaire_assignments
  for select using (
    opportunity_version_id in (
      select id from sih26044.opportunity_versions
      -- RLS enforces visibility
    )
  );

-- Opportunity questionnaire assignments: write by opportunity owner
create policy opportunity_questionnaire_write on sih26044.opportunity_questionnaire_assignments
  for all using (
    opportunity_version_id in (
      select ov.id from sih26044.opportunity_versions ov
      inner join sih26044.opportunities o on o.id = ov.opportunity_id
      inner join sih26044.organization_memberships m on m.organization_id = o.owner_organization_id
      inner join sih26044.organization_membership_roles mr on mr.membership_id = m.id
      where m.actor_id = sih26044.current_actor_id()
        and m.status = 'active'
        and mr.role in ('institution_admin', 'recruiter')
    )
  );

-- Submissions: students see own submissions; org members see submissions for their questionnaires
alter table sih26044.questionnaire_submissions enable row level security;
create policy questionnaire_submissions_student_read on sih26044.questionnaire_submissions
  for select using (respondent_actor_id = sih26044.current_actor_id());

create policy questionnaire_submissions_org_read on sih26044.questionnaire_submissions
  for select using (
    questionnaire_version_id in (
      select qv.id from sih26044.questionnaire_versions qv
      inner join sih26044.questionnaires q on q.id = qv.questionnaire_id
      inner join sih26044.organization_memberships m on m.organization_id = q.owner_organization_id
      where m.actor_id = sih26044.current_actor_id()
        and m.status = 'active'
    )
  );

-- Submissions: students can insert/update own submissions (before submitted_at is set)
create policy questionnaire_submissions_student_write on sih26044.questionnaire_submissions
  for all using (
    respondent_actor_id = sih26044.current_actor_id()
    and submitted_at is null
  );

-- Responses: follow submission read policy
alter table sih26044.questionnaire_responses enable row level security;
create policy questionnaire_responses_read on sih26044.questionnaire_responses
  for select using (
    submission_id in (
      select id from sih26044.questionnaire_submissions
      -- RLS enforces visibility
    )
  );

-- Responses: students can insert/update responses for their in-progress submissions
create policy questionnaire_responses_student_write on sih26044.questionnaire_responses
  for all using (
    submission_id in (
      select id from sih26044.questionnaire_submissions
      where respondent_actor_id = sih26044.current_actor_id()
        and submitted_at is null
    )
  );

-- Indexes for performance
create index questionnaires_org_status_idx on sih26044.questionnaires(owner_organization_id, status);
create index questionnaire_versions_questionnaire_idx on sih26044.questionnaire_versions(questionnaire_id, version_number desc);
create index questionnaire_questions_version_ordinal_idx on sih26044.questionnaire_questions(questionnaire_version_id, ordinal);
create index opportunity_questionnaire_assignments_opportunity_idx on sih26044.opportunity_questionnaire_assignments(opportunity_version_id);
create index opportunity_questionnaire_assignments_questionnaire_idx on sih26044.opportunity_questionnaire_assignments(questionnaire_id);
create index questionnaire_submissions_respondent_idx on sih26044.questionnaire_submissions(respondent_actor_id, submitted_at);
create index questionnaire_submissions_questionnaire_version_idx on sih26044.questionnaire_submissions(questionnaire_version_id);
create index questionnaire_submissions_opportunity_idx on sih26044.questionnaire_submissions(opportunity_id, opportunity_version_id);
create index questionnaire_responses_submission_idx on sih26044.questionnaire_responses(submission_id);

-- Comments
comment on table sih26044.questionnaires is 'Industry-authored questionnaires for technical and soft-skill evaluation. Stable identity across versions.';
comment on table sih26044.questionnaire_versions is 'Immutable questionnaire versions. Published versions must not mutate after submissions exist.';
comment on table sih26044.questionnaire_questions is 'Questions within a questionnaire version. Supports single/multiple choice, numeric, text, and structured scenario types.';
comment on table sih26044.opportunity_questionnaire_assignments is 'Many-to-many binding of questionnaires to opportunity versions.';
comment on table sih26044.questionnaire_submissions is 'Student responses to questionnaires. Supports deterministic scoring where configured.';
comment on table sih26044.questionnaire_responses is 'Individual question answers within a submission.';
comment on column sih26044.questionnaire_versions.scoring_policy is 'Deterministic scoring rules. Null means no automatic scoring. Free-text responses must not silently score candidates.';
comment on column sih26044.questionnaire_submissions.computed_score is 'Deterministic score computed from scoreable questions. Not a hiring probability.';
