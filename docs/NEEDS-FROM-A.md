# Needs from Track A

Track B depends on artifacts owned by Track A that are not yet delivered.
This file lists what is missing and what must be restored during the final merge.

## Pending artifacts

- `components/brand/Mascot.tsx` — 7 poses pixel-art, pose API.

## Barrel lines to restore on final merge

In `components/brand/index.ts`, restore:

```ts
export * from './Mascot'
```
