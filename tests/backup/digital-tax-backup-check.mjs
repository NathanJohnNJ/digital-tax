import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "digital-tax-backup-test-"));
const log = join(temporaryDirectory, "restic-arguments");
const script = resolve("scripts/digital-tax-backup.sh");

writeFileSync(join(temporaryDirectory, "findmnt"), '#!/bin/sh\n[ "${MOUNT_MISSING:-0}" = 0 ] || exit 1\nprintf "%s\\n" "$MOUNT_UUID"\n', { mode: 0o755 });
writeFileSync(join(temporaryDirectory, "restic"), '#!/bin/sh\nprintf "%s\\n" "$@" > "$TEST_LOG"\nexit "${RESTIC_EXIT:-0}"\n', { mode: 0o755 });
after(() => rmSync(temporaryDirectory, { recursive: true }));

function run(overrides = {}) {
  return spawnSync("sh", [script], {
    encoding: "utf8",
    env: {
      PATH: `${temporaryDirectory}:/usr/bin:/bin`,
      BACKUP_DRIVE_UUID: "expected",
      MOUNT_UUID: "expected",
      TEST_LOG: log,
      ...overrides,
    },
  });
}

test("streams the intended database schemas into restic", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const args = readFileSync(log, "utf8").trim().split("\n");
  assert.deepEqual(args, [
    "backup", "--stdin-filename", "digital-tax.dump", "--stdin-from-command", "--",
    "pg_dump", "--format=custom", "--compress=0", "--strict-names",
    "--schema=public", "--schema=supabase_migrations", "--no-owner", "--no-password",
  ]);
});

test("refuses a missing or unexpected mount", () => {
  for (const overrides of [{ MOUNT_MISSING: "1" }, { MOUNT_UUID: "wrong" }]) {
    const result = run(overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expected USB drive is not mounted/);
  }
});

test("reports restic backup failure", () => {
  assert.equal(run({ RESTIC_EXIT: "1" }).status, 1);
});

test("has valid shell syntax", () => {
  execFileSync("sh", ["-n", script]);
});
