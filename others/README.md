# Supporting Project Material

This directory preserves non-runtime artifacts that support the CareerCase demo,
presentation, research, and implementation history. They are kept outside the
project root so the application structure remains easy to scan. No material was
deleted during this reorganization.

## Inventory

### `presentation-assets/`

- `homepage.jpg` — stable 1280 x 720 product screenshot suitable for the main
  repository README and other project summaries.

### `deck-work/`

- `deliverables/` — exported PowerPoint files, slide previews, inspection
  metadata, the AI slides archive, and the original visual reference.
- `sih-final-presentation-work/` — final-deck generator, source assets,
  references, and rendered slide previews.
- `sih-idea-presentation-work/` — earlier deck generator, layout data, and
  rendered previews.
- `template-inspection/` — template audits, frame maps, extracted media, and QA
  results.
- `reference-material/` — benchmark deck images and the supplied SIH format
  reference.
- `handoffs/` — the detailed PPTX production handoff.

### `reports/`

- `implementation/` — historical implementation summaries, verification notes,
  task completion records, and archived change notes.
- `test-reports/` — retained machine-readable QA output.

### `research/`

- `planning/` — the archived product requirements and planning context.
- `messagehistory.md` — retained implementation-session history.

### `demo-assets/`

- `demo-sample-resume.md` — editable source material for the demo persona.
- `Priya_Sharma_Resume_Demo.docx` — upload-ready resume for the Priya Sharma
  demo account.
- `convert_resume_to_docx.py` — helper used to produce the DOCX demo asset.

## Reuse note

Some archived deck-generation scripts and inspection metadata contain absolute
paths from the workspace layout in which they were created. Update those paths
before rerunning the scripts from their new archival locations.
