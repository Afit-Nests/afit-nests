# FILE_UPLOADS Security Report

## Status: LOW

## Findings

Uploads are implemented in:

```text
server/src/routes/uploads.js
src/lib/personalBackendClient.js
```

Fixes implemented during this audit:

- Listing photos can only be uploaded by landlords/admins.
- Uploads are limited to 5MB server-side.
- Files are renamed with `crypto.randomUUID()`.
- MIME type is checked against JPG, PNG, and WEBP.
- Magic-byte signatures are now validated for JPG, PNG, and WEBP.

Remaining limitation: uploaded files are served from the same backend domain under `/uploads`, not from a separate object-storage domain/bucket.

## What's at risk

If upload validation is weak, attackers can upload non-image content or abuse storage. Same-domain file serving can increase impact if a future content-type bug appears.

## What's already secure

- Auth required.
- Role restriction for listing uploads.
- Size limit enforced.
- Server-generated filenames.
- Path traversal protection.
- Magic-byte validation.

## Recommendations

1. Move production uploads to S3/R2/GCS or similar object storage.
2. Serve uploads from a separate media domain.
3. Consider image re-encoding/resizing before storage.
