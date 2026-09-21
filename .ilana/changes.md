# Change requests

## CR-001 | Approved

Complete the user-facing wiring, tier availability, model selection, pricing gates, and verification coverage for the application's existing AI capabilities.

## CR-002 | Approved

Harden the product before launch: alert administrators before manually tracked provider credits expire, verify generation paths without billable calls, gate enterprise-only HeyGen custom-avatar creation, improve the supported fallback path and general UX, add profile-image management, replace unreviewed legal text with admin-editable coming-soon documents, rebuild the public status page around measured facts, and stress-test account and read paths with disposable local users.

## CR-003 | Approved

Keep the desktop admin section navigation visible while long admin pages scroll, without changing the mobile horizontal navigation.

## CR-004 | Approved

Make the new-avatar route creation-only and enforce a maximum of five reusable avatars per account at every application boundary.

## CR-005 | Approved

Supersede CR-004's separate creation route. Keep avatar discovery, the empty state, recording, and the avatar library in one inline flow at `/dashboard/assets`; retain the five-avatar maximum.

## CR-006 | Approved

Keep the legacy `/dashboard/avatar/new` path clickable in stored assistant replies while redirecting it to the consolidated avatar flow.

## CR-007 | Approved

Release avatar camera and microphone tracks immediately after recording and whenever the recorder unmounts, including permission requests that resolve after navigation.

## CR-008 | Approved

Stop the avatar wizard's training state when its asynchronous completion returns an error, show that error inside the active flow, and hide downstream avatar-video controls during creation.
