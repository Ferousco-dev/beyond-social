# Gemini

AI orchestration and evaluation layer for the new backend.

## Responsibilities

- Interpret user intent and construct structured workflow plans.
- Select supported capabilities within the permitted backend policy.
- Evaluate output quality when the workflow requires a judgment step.
- Remain subordinate to backend authorization and execution controls.

## Guardrails

Gemini is not allowed to bypass backend auth, execute arbitrary provider actions, or mutate state without explicit approval from the application layer.
