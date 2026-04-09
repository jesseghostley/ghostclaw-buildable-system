# GhostClaw Deploy SOP

Standard operating procedure for batch site deployment to cPanel hosting via WHM API.
Based on the successful Batch 1 deployment (5 Arkansas storm damage contractor sites).

---

## 1. Precheck

Before any deployment action:

1. **Load batch source of truth** — read DEPLOY_MANIFEST.json or manifest.json
2. **Validate domains** — no duplicates within batch, no duplicates across prior batches
3. **Validate usernames** — each ≤16 characters, unique, no collisions with existing server accounts
4. **Validate zip files** — each site zip exists, is valid, contains exactly 6 files (index.html, about.html, contact.html, style.css, schema.json, SITE_CONFIG.json)
5. **Connect to WHM** — verify API token authenticates (HTTP 200 on version endpoint)
6. **Query live server state** — run `listaccts` to get all existing accounts
7. **Check each domain** — is it a primary domain, addon, parked, or absent?
8. **Check each username** — does it already exist on the server?
9. **Check DNS zones** — are there stale zones from deleted accounts?
10. **Check account limits** — is the reseller at capacity?

**Stop if:** WHM auth fails, manifest has duplicates, zip files missing, or deploy context is ambiguous.

### Batch 1 proof:
Precheck discovered 3 existing accounts (2 with correct usernames, 1 with wrong username), 2 domains registered as addon domains under a different account, and a 100-account reseller limit. All were resolved before deployment proceeded.

---

## 2. Cleanup Decision Rules

For each domain, compare live state to manifest target:

| Live State | Target | Decision |
|------------|--------|----------|
| Does not exist anywhere | New standalone account | **first-deploy** |
| Exists as primary, username matches | Same account | **update-deploy** |
| Exists as primary, username differs | Wrong account | **cleanup-and-redeploy** — delete old account, create correct one |
| Exists as addon under another account | Standalone account | **remove addon, then first-deploy** |
| Exists as parked under another account | Standalone account | **unpark, then first-deploy** |
| Stale DNS zone exists, no account | New standalone account | **remove zone, then first-deploy** |

**Never:**
- Delete an account without confirming it matches the domain being cleaned
- Remove addon domains from accounts outside the current batch without explicit approval
- Assume a domain can be overwritten — verify ownership first

### Batch 1 proof:
- paragouldsd, springdalesd: update-deploy (correct username, files needed refresh)
- rogerssr → rogersstormrs: cleanup-and-redeploy (wrong username)
- starcityemergencyrooftarping.com, warrenstormdamage.com: remove addon from paragouldsd, then first-deploy
- warrenstormdamage.com had stale DNS zone after addon removal: zone removed, then first-deploy

---

## 3. Deploy Mode Selection

Explicitly select one mode per site. Never mix modes silently.

### first-deploy
- Account does not exist
- Create standalone cPanel account via `createacct`
- Upload zip, extract to `/public_html/`, cleanup zip
- Trigger AutoSSL

### update-deploy
- Account exists with correct username
- Create timestamped backup of `/public_html/`
- Remove stale/legacy files that do not belong
- Upload correct zip, extract to `/public_html/`, cleanup zip
- Trigger AutoSSL

### repair-deploy
- Account exists but files are wrong, incomplete, or contaminated
- Create timestamped backup
- Wipe `/public_html/` contents (preserve `.htaccess`, `.well-known`)
- Upload correct zip, extract, cleanup
- Trigger AutoSSL

**Deploy mode must be recorded in the deployment result for each site.**

---

## 4. Backup Behavior

**When to backup:**
- Always before update-deploy
- Always before repair-deploy
- Never needed for first-deploy (empty account)

**How:**
- Copy `/public_html/` to `/public_html_backup_{YYYYMMDD_HHMMSS}/` via cPanel Fileman API
- Record backup path in deployment result

**Retention:**
- Backups live on the cPanel account filesystem
- Do not delete backups automatically — leave for manual review

### Batch 1 proof:
paragouldsd backed up to `/home/paragouldsd/public_html_backup_20260409_024722` before stale file removal and fresh deploy.

---

## 5. Live Deployment

Execute in this order:

1. **Cleanup phase** (if needed)
   - Remove addon domains via cPanel API2 `AddonDomain::deladdondomain`
   - Delete wrong-username accounts via WHM `removeacct`
   - Remove stale DNS zones via WHM `killdns`
   - Wait 2-3 seconds between destructive operations

2. **Account creation phase**
   - Create each new account via WHM `createacct`
   - Use `forcedns=1` if stale DNS zone was not removable
   - Wait 3 seconds after creation for provisioning
   - Verify account exists after creation

3. **File upload phase** (per site)
   - Upload zip via cPanel session (port 2083, multipart upload)
   - Extract via cPanel API2 `Fileman::fileop` (op=extract)
   - Delete zip from server via `Fileman::fileop` (op=unlink)
   - For update-deploy: remove stale files before upload

4. **SSL phase**
   - Trigger `start_autossl_check_for_one_user` for each account
   - If API returns error (reseller limitation), record as "needs manual trigger"

**If any site fails during deployment, stop at that site, record the error, and continue to the next site. Do not retry destructive operations.**

### Batch 1 proof:
Two addon removals, one account deletion, three account creations, five file uploads, five AutoSSL requests (all needed manual trigger due to reseller API limitation).

---

## 6. Verification

After all sites are deployed, verify each:

1. **File check** — list `/public_html/` via UAPI, confirm all 6 correct files present
2. **HTTP check** — request `http://{server-ip}/` with `Host: {domain}` header, expect 200
3. **HTTPS check** — request `https://{domain}/`, expect 200 (may use shared cert initially)
4. **Content check** — verify domain or business identity appears in response body
5. **Contamination check** — no wrong-domain references, no Batch 2 content, no addon leftovers

**Report per site:** files present, HTTP status, HTTPS status, content match, extra/stale files found.

### Batch 1 proof:
All 5 sites returned HTTP 200, HTTPS 200, correct 6 files present. paragouldsd was clean after stale removal. springdalesd had 3 non-harmful legacy files noted.

---

## 7. Deploy-State Recording

After deployment, write `deploy_final_results.json` containing:

```json
{
  "results": {
    "domain.com": {
      "status": "SUCCESS|FAILED",
      "detail": "description of action taken"
    }
  },
  "ssl": {
    "username": "requested|needs manual trigger|error"
  },
  "backup_path": "/home/username/public_html_backup_TIMESTAMP",
  "timestamp": "ISO-8601"
}
```

Commit and push to the deployment repo branch.

---

## 8. Blocker Handling

| Blocker | Action |
|---------|--------|
| WHM auth fails (401/403) | Stop. Report. Do not retry with guessed credentials. |
| Account limit reached | Stop. Report count. List accounts for review. Do not delete accounts without approval. |
| Domain exists in userdata (no account) | Remove stale zone. Retry with `forcedns=1`. |
| Domain exists as addon | Remove addon via API. If removal fails, escalate to human. |
| Username collision | Stop at that site. Report which account owns the username. |
| Zip upload fails | Retry once. If second attempt fails, stop at that site. |
| Extract fails | Stop at that site. Do not re-upload without diagnosis. |
| Server unreachable | Retry with exponential backoff (2s, 4s, 8s, 16s), max 4 attempts. |

---

## 9. When to Stop

Stop immediately and report if:

- Source files conflict with each other (manifest says X, SITE_CONFIG says Y)
- Deploy context is missing (no manifest, no credentials, no server target)
- A domain is assigned to a username that belongs to a different domain
- An account deletion would affect a domain outside the current batch
- The server returns unexpected state (accounts that shouldn't exist, domains on wrong accounts)
- Any destructive action fails (addon removal, account deletion)

**Do not proceed past a stop condition by guessing or assuming.**

---

## 10. When to Fall Back to Human Approval

Escalate to human before acting if:

- Reseller account limit is reached and accounts need to be deleted to make room
- An existing account has files that were not deployed by GhostClaw (unknown origin)
- DNS zone removal requires root-level access the reseller token cannot perform
- AutoSSL cannot be triggered via API (manual WHM UI action needed)
- A domain is live and serving traffic to real users — confirm before overwriting
- Any operation requires `--force`, `forcedns`, or equivalent override flags
- The batch contains a domain that exists on a different WHM server entirely
- Credentials are expired, rejected, or produce inconsistent results

**The cost of pausing to confirm is always lower than the cost of destroying a live site.**
