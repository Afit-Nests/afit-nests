# FILE_UPLOADS Fix Plan

## Changes

- `server/src/routes/uploads.js` - restrict listing photo uploads to landlords/admins.
- `server/src/routes/uploads.js` - add image magic-byte validation.

## New files

- `security/reports/FILE_UPLOADS_REPORT.md`
- `security/plans/FILE_UPLOADS_PLAN.md`

## Verification goals

- [x] File type validated by magic bytes.
- [x] Files renamed server-side with UUIDs.
- [x] Size limits enforced server-side.
- [ ] Production files stored on a separate domain/bucket.

## Manual verification (for the human)

- Upload a renamed `.txt` file with `image/png` content type and confirm the backend rejects it.
- Configure object storage before high-traffic production use.
