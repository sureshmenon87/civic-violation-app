# Backend Stability Checklist

This checklist contains step-by-step smoke tests, commands, and expected outcomes to verify the backend is stable. Save this file for future reference.

---

## 1. Environment & process

- Verify environment variables are loaded:

  ```bash
  echo $NODE_ENV $MONGO_URI $FILE_STORAGE_BACKEND
  ```

  **Expect:** values populated (e.g. `development`, valid `MONGO_URI`, `gridfs|s3|gcs`).

- Start the server:

  ```bash
  npm run dev
  # or your start command
  ```

  **Expect:** console shows `Server listening on http://localhost:4000` and `Connected to MongoDB`.

---

## 2. Health endpoint

```bash
curl -sS http://localhost:4000/health | jq .
```

**Expect:** `{ "ok": true }`

---

## 3. Auth (OAuth → tokens → protected routes)

### Interactive login

- Open browser: `http://localhost:4000/auth/google` and complete consent.
- Verify callback returns JSON `{ token, user }` or sets cookie `rtk`.

### Refresh -> access token (curl)

```bash
curl -v -X POST http://localhost:4000/auth/refresh -H "Cookie: rtk=<COOKIE_FROM_BROWSER>"
```

**Expect:** `200` JSON `{ "accessToken": "eyJ..." }` and `Set-Cookie` header rotated.

### Call protected endpoint

```bash
curl -v -X GET http://localhost:4000/api/v1/profile -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expect:** `200` JSON user profile.

---

## 4. Upload flows (GridFS / S3 / GCS)

### GridFS direct upload

```bash
curl -i -X POST http://localhost:4000/api/v1/uploads \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/path/to/image.jpg"
```

**Expect:** `201` JSON with `id`, `filename`, `downloadUrl`.

### Download uploaded file

```bash
curl -v "http://localhost:4000/api/v1/reports/download/<id>" -o out.jpg
```

**Expect:** downloaded file matches original.

### S3/GCS presign flow

1. Presign: `POST /api/v1/uploads/s3/presign` (auth)
2. PUT file to returned URL
3. Optionally `POST /api/v1/uploads/s3/complete`

---

## 5. Create Report (upload + create)

```bash
curl -i -X POST http://localhost:4000/api/v1/reports \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "title=Garbage near park" \
  -F "description=Lots of trash" \
  -F "category=pollution" \
  -F "locationLng=77.59" \
  -F "locationLat=12.97" \
  -F "file=@/path/to/image.jpg"
```

**Expect:** `201` report JSON with `photos` array.

---

## 6. Update & Delete

- Update with optional file:

```bash
curl -X PUT http://localhost:4000/api/v1/reports/<reportId> \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "title=Updated title" \
  -F "file=@/path/to/new.jpg"
```

**Expect:** `200` updated report.

- Soft delete (owner):

```bash
curl -X DELETE http://localhost:4000/api/v1/reports/<reportId> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expect:** `200` and `deletedAt` is set.

- Hard delete (admin):

```bash
curl -X DELETE "http://localhost:4000/api/v1/reports/<reportId>?soft=false" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

**Expect:** `200`, DB doc removed and storage objects deleted.

---

## 7. Error handling & logs

- Trigger validation error and expect `400` with structured details.
- Check logs for no leaked stack traces to clients.

---

## 8. Security basics

- `helmet()` in place
- Rate limiting on sensitive endpoints
- CORS configured with `credentials: true` for frontend origin

---

## 9. Backups & monitoring

- Ensure DB backups and monitoring are configured for production.

---

## 10. Troubleshooting quick hits

- If auth fails: check OAuth redirect URIs, `BASE_URL`, cookie flags, strategy registration order.
- If DB calls hang: ensure `connectDb()` is awaited before mounting routes.
- If uploads fail: check `FILE_STORAGE_BACKEND`, credentials and bucket permissions.

---

## Quick smoke script (optional)

Save a script to `scripts/smoke.sh` and update tokens/paths before running.

```bash
#!/bin/bash
BASE="http://localhost:4000"
ACCESS="<ACCESS_TOKEN>"
set -e
curl -s $BASE/health | jq .
curl -s $BASE/api/v1/reports | jq '.[0]'
```

---

_Last updated: 2025-09-07_
