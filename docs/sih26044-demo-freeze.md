# SIH26044 demo freeze

Status: CONTROLLED PROTOTYPE (deterministic local/replay fixture). This is not a production deployment or a live government integration.

## Five-minute golden path

1. Open `/demo` and select the Student persona.
2. Show the flagship opportunity and its initial readiness explanation (`BUILDING_EVIDENCE`).
3. Attach the controlled work sample; readiness recomputes deterministically (`NEAR_READY`).
4. Apply the controlled mentor verification event; the explanation changes to `READY_FOR_REVIEW`.
5. Grant application-review consent and submit. Show the frozen application snapshot and exact recruiter projection.
6. Switch to Recruiter, start human review, then shortlist. Emphasize that no ranking or automatic rejection exists.
7. Record the selected outcome and show institution aggregate-only analytics with suppression for small cohorts.

Narrative: “The AI didn't change its mind. The evidence changed.” Recruitment: “CareerCase supports the decision. It never makes it.”

## Ninety-second fallback

Open `/demo`, use the preloaded flagship fixture, perform the work-sample and mentor actions, then show the readiness trace and the immutable submission snapshot. No network, LLM, government API, or database surgery is required.

## Reset and deep links

`RESET_CONTROLLED_DEMO` returns the reducer to the byte-equivalent fixture baseline. The demo route is isolated from production auth/providers; production deep links remain under `/opportunities/:opportunityVersionId/apply` and `/applications/:applicationId`.

Hosted deployment, live connector credentials, and hosted database replay remain CREDENTIAL-GATED until authorized evidence is available.
