#!/bin/sh
set -eu

mount=/mnt/digital-tax-backup
expected_uuid=${BACKUP_DRIVE_UUID:?BACKUP_DRIVE_UUID must be set}

if ! actual_uuid=$(findmnt -rn -o UUID --mountpoint "$mount") || [ "$actual_uuid" != "$expected_uuid" ]; then
  echo "Backup stopped: the expected USB drive is not mounted at $mount." >&2
  exit 1
fi

export RESTIC_REPOSITORY="$mount/digital-tax"
export RESTIC_PASSWORD_FILE=/etc/digital-tax-backup/restic-password
export PGSERVICEFILE=/etc/digital-tax-backup/pg_service.conf
export PGSERVICE=digital-tax-backup
export PGCONNECT_TIMEOUT=30

exec restic backup --stdin-filename digital-tax.dump --stdin-from-command -- \
  pg_dump --format=custom --compress=0 --strict-names \
  --schema=public --schema=supabase_migrations --no-owner --no-password
