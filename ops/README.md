# Digital Tax database backups

The Raspberry Pi workflow streams a PostgreSQL custom-format dump of `public` and `supabase_migrations` into an encrypted restic repository on a dedicated USB drive. It uses a single database snapshot; plaintext dump files are not written to disk. The dump requires permission to read all included tables. Restic cancels the backup if `pg_dump` fails. Failures appear in the systemd journal.

This is not a full Supabase project backup. It does not include other database schemas, global roles and their passwords, Supabase Storage objects, configuration, or application secrets. Review this scope whenever the app starts using other Supabase features. Keep the restic password and the application's `HMRC_TOKEN_ENCRYPTION_KEY` securely backed up separately from the Pi and USB; the database dump alone cannot decrypt HMRC tokens. CSV exports are not backups.

## Pi prerequisites

- Debian 13 packages `restic` and `postgresql-client-17`. The `pg_dump` major version must be at least the database server's major version.
- A persistent ext4 USB mount at `/mnt/digital-tax-backup`, configured with `nofail` so the Pi can boot without it. The script refuses to run unless the filesystem UUID matches `BACKUP_DRIVE_UUID`.
- An initialised restic repository at `/mnt/digital-tax-backup/digital-tax`; its password is in root-only `/etc/digital-tax-backup/restic-password`.
- Root-only `/etc/digital-tax-backup/pg_service.conf`, with the `[digital-tax-backup]` PostgreSQL connection parameters. Use the Supabase session pooler on port 5432 where direct IPv6 is unavailable; use `sslmode=verify-full` and Supabase's CA certificate. Keep credentials out of the repository, shell history and logs.
- Root-only `/etc/digital-tax-backup/config` containing `BACKUP_DRIVE_UUID=<USB filesystem UUID>`. It must be a systemd EnvironmentFile, not a shell script.

For the detailed official connection and recovery limitations, see [Supabase SSL guidance](https://supabase.com/docs/guides/platform/ssl-enforcement), [backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), and [restic backup documentation](https://restic.readthedocs.io/en/v0.18.0/040_backup.html).

## Install and run

After making the tracked files available on the Pi, from the project directory:

```sh
sudo install -m 0755 scripts/digital-tax-backup.sh /usr/local/sbin/digital-tax-backup
sudo install -m 0644 ops/systemd/digital-tax-backup.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/digital-tax-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start digital-tax-backup.service
sudo systemctl status digital-tax-backup.service --no-pager
```

Confirm a new snapshot was created and the service completed successfully before enabling the daily schedule:

```sh
sudo systemctl enable --now digital-tax-backup.timer
systemctl list-timers digital-tax-backup.timer --no-pager
```

The timer runs at approximately 02:00 local time, with up to 15 minutes' random delay; a missed run is started when the Pi is next running. Check the journal and snapshot dates regularly:

```sh
sudo journalctl -u digital-tax-backup.service --since "7 days ago" --no-pager
sudo env RESTIC_REPOSITORY=/mnt/digital-tax-backup/digital-tax \
  RESTIC_PASSWORD_FILE=/etc/digital-tax-backup/restic-password restic snapshots
```

Before any restic command, verify that the expected USB UUID is mounted. A successful scheduled run is not an alert: monitor failures, stale snapshots, and free space. There is no automatic snapshot deletion or pruning; establish and verify a retention policy before the drive fills. Keep an additional protected copy in a separate physical location because the Pi and USB can be lost together.

On 16 November 2026, the operator confirmed a manual service run succeeded, enabled the timer and ran `restic check --read-data` without errors. The first scheduled execution and an isolated restore have not yet been verified.

## Recovery verification

Run `restic check` against the mounted repository and test a restore to an isolated disposable database, never to the shared live database. Compare schema, permissions, row-level security, migration history and representative data, and verify that the application can use the restored data. Restore requires compatible PostgreSQL tools, roles/extensions and dependencies that are not included in this partial dump; follow the current Supabase recovery guidance and verify the actual target before running any restore. Record the result in [the testing plan](../testing.md). Do not mark recovery complete based only on a successful backup or `restic check`.
