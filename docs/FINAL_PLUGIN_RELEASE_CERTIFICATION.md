# Final WordPress Plugin Release Certification

This runbook is the final plugin gate before a public zip is installed on a
production customer site. It pairs the automated Docker certification matrix
with the one piece that must be captured in a real staging environment: the
normal SaaS challenge flow and Action Scheduler execution.

## Automated Gate

Run from the repository root:

```bash
npm run plugin:release:certify
```

The command performs:

- plugin version parity verification across `VERSION`, the plugin header,
  runtime constant, `readme.txt`, and Composer metadata;
- fresh `dist/seo-content-control-center-<version>.zip` generation;
- archive integrity and runtime-only content verification;
- SHA-256, byte-size, and zip-entry metadata output for release notes;
- WordPress certification across latest WordPress on PHP 8.1, 8.2, and 8.3
  plus the previous WordPress branch.

The matrix installs the exact built zip into disposable WordPress containers and
checks activation, installed version, REST route registration, seeded connection
storage, recurring sync through the WP-Cron fallback, signed safe-operation
apply writes, tampered-signature rejection, deactivation cleanup, and clean
delete.

Use `SCCC_WP_MATRIX="image1 image2"` only for targeted reruns. A final release
must pass the default full matrix.

## Artifact Evidence

Record the command output here before publishing:

| Field              | Value |
| ------------------ | ----- |
| Certification date |       |
| Git commit SHA     |       |
| Plugin version     |       |
| Archive path       |       |
| SHA-256            |       |
| Size bytes         |       |
| Zip entries        |       |
| Matrix result      |       |
| Operator           |       |

## Staging Action Scheduler Evidence

Use a real staging SaaS origin and a real staging WordPress site. Do not seed
plugin credentials directly for this section.

Prerequisites:

- staging SaaS env passed `npm run deploy:staging:rehearse`;
- final zip from `npm run plugin:release:certify` is installed;
- Action Scheduler is installed and active on the staging WordPress site;
- the staging WordPress site has at least 250 posts/pages for paginated sync.

Steps:

1. Start a plugin connection challenge from the staging SaaS dashboard.
2. Complete the challenge exchange from the WordPress plugin admin UI.
3. Confirm the plugin settings page reports the connected organization/site.
4. Confirm the SaaS dashboard reports the same site as connected.
5. Confirm recurring sync status reports `Action Scheduler`.
6. Trigger manual sync from the plugin settings page.
7. In Action Scheduler, confirm an action in group
   `seo-content-control-center` runs for `sccc_run_manual_sync`.
8. Confirm a recurring action exists for `sccc_run_incremental_sync`.
9. Confirm the plugin sync log records a successful sync with more than one
   inventory batch.
10. Confirm SaaS synced inventory for the staging site contains more than 200
    items and the detail panel shows SEO metadata.

Pass criteria:

- the challenge is one-time and no token or signature appears in UI/logs;
- Action Scheduler is used instead of the WP-Cron fallback;
- manual and recurring actions are in the `seo-content-control-center` group;
- sync pagination continues after the first 200 items;
- SaaS data remains scoped to the selected organization and site;
- disconnect or plugin deactivation removes scheduled plugin actions.

Evidence:

| Check                                      | Result | Notes |
| ------------------------------------------ | ------ | ----- |
| SaaS challenge created                     |        |       |
| WordPress exchange completed               |        |       |
| SaaS connection visible                    |        |       |
| Recurring scheduler shows Action Scheduler |        |       |
| Manual action completed                    |        |       |
| Recurring action exists                    |        |       |
| Inventory exceeds 200 synced items         |        |       |
| Sync logs redacted                         |        |       |
| Deactivation cleanup checked               |        |       |

## Release Blockers

Do not publish the zip when any of these are true:

- `npm run plugin:release:certify` fails or was run with a reduced matrix;
- artifact checksum/version cannot be matched to the release notes;
- staging connection was seeded instead of completed through the challenge UI;
- staging falls back to WP-Cron while Action Scheduler is expected to be active;
- paginated sync does not cross the 200-item boundary;
- any secret, token, HMAC signature, or authorization value appears in logs.
