# Mausritter local fork for Foundry VTT 14.367

This fork targets v14 only. It keeps the `mausritter` system ID, existing document types and data fields, the installed sheet artwork and layouts, and the existing game rules.

System version: **0.7.0-local.5**. Item Tooltips and Condition Image: **1.1.0-local.1**.

Version local.5 replaces the spell power field with Foundry's native range picker: a slider with a live number display. It starts at 1, moves in whole-number steps, and obeys the existing configured cap. No new settings or data migration are needed.

Version local.4 adds the world setting **Limit spell power to remaining uses**, enabled by default. With it enabled, power is capped at maximum usage minus marked uses; zero remaining uses blocks casting regardless of the separate exhaustion setting. With it disabled, the local.3 total-maximum cap applies. Fully marked spells can cast only when both settings are disabled. The power dialog and shared casting checks use the same limit and recheck current usage/settings when confirming. No data migration is required.

Version local.3 caps spell power at total maximum usage (not remaining uses), saves one usage mark per d6 showing 4–6, and keeps marks within the maximum. The world setting **Configure Settings → Mausritter → Block casting exhausted spells** defaults to enabled. Disabling it permits exhausted spells to cast without removing the power limit. Spells need a positive whole-number maximum usage. Inventory actions and macros share these checks; limits are rechecked after the power dialog. No world or compendium migration is required. `tests/spell-casting.test.mjs` covers these rules, cancellation, stale items and failed writes.

## Migration plan and implementation

1. Preserve the installed system, both add-ons and MouseTest world; test a separate data directory on port 30001.
2. Retain upstream source at commit `4b99324` and the installed asset/add-on baseline at local commit `545f5c5`.
3. Replace all four Actor sheets and six Item sheets with ApplicationV2/Handlebars sheets. Use native actions, forms, tabs, image pickers, drag data and ProseMirror editors.
4. Replace legacy dialogs, character-generation calls, chat messages and hotbar handling. Native chat rolls provide visibility controls and Dice So Nice integration.
5. Update the two add-ons to V2 hooks, including tooltip cleanup after rerender and close.
6. Migrate saved minified sheet IDs and unchanged original Weather, Hex and NPC macro commands. Preserve edited macros. Update bundled compendia for fresh installations.
7. Validate sheets, inventory, rolls, generators, macros, token actors, locked compendia and the selected integrations; compare existing world data; build and install packages with rollback instructions.

Item moves create the destination before deleting the source. Ctrl-drag copies; transfers involving unlinked token actors retain the previous copy behavior. Display-only inventory preparation no longer changes persisted Item data.

Version 0.7.0-local.2 also replaces the deprecated `template.json`: `system.json` declares all four Actor and six Item types, and `src/data-models.js` supplies native TypeDataModels with the same fields and defaults. Existing values and extra saved fields are retained. Actor biography/notes and Item descriptions are declared as HTML fields for server sanitization. No document IDs or field paths change, no bulk rewrite is needed, and this patch makes no visual changes. The first migration missed the warning emitted by the setup screen before any world loads.

Sheet and macro migration run once for the active GM. They restore compendium lock states and retry on a later launch after a failure. `src/legacy-macros.json` contains old commands only as exact-match migration data; these strings are never executed.

## Build and package

Use Node 22.12 or later (Foundry itself requires Node 24.13.1–24.x) and Python 3:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd test
npm.cmd run build
python scripts/package.py
```

The build is in `dist`. Archives and checksums are written to `../../Releases/zip`. The package script excludes local JavaScript backup files and refuses to ship the validation runner. Keep `public/packs` binary: LevelDB CURRENT files must retain LF endings, and its `.log` files are database content, not disposable application logs.

Use `package-lock.json` for this fork. No additional runtime dependency is required.

## Validation

`tests/migration.test.mjs` uses Node's built-in test runner to cover drop geometry, safe moves/copies, display preparation, literal macro names, exact-match migrations and cancelled dialogs.

`tests/data-models.test.mjs` checks the models against actual Foundry core fields, including saved values, extra fields, partial updates and manifest declarations. It uses this workspace's installed core by default; elsewhere set `FOUNDRY_COMMON` to Foundry's `common/server.mjs`. The check is explicitly skipped if core is unavailable. Also launch Foundry without a world, sign in as administrator, and check **Warnings** to cover package loading independently of world code.

`tests/in-foundry.mjs` is a development-only runner restricted to port 30001. Copy it into the isolated system's `tests` directory and append `tests/in-foundry.mjs` to that copy's manifest `esmodules`. Launch the isolated MouseTest copy with Foundry 14.367, sign in as GM, then use **Core checks** and **Integration checks**. These buttons change the isolated world's module configuration and create clearly marked temporary data; never install this runner in a real world.

The integration selection is Item Tooltips, Condition Image, Mausritter JSON Importer, Status Weaver and Dice So Nice. Checks cover all actor/item types, rich-text saving, inventory positioning/rotation/pips/copy/move, compendium provenance, storage resizing, public/GM/self/blind rolls, character options/cancellation, bundled macros, linked/unlinked tokens, read-only packs, hotbar macros, tooltip placement/cleanup, six-type JSON imports, status synchronization and native 3D dice hooks. Actual browser editing also verifies notes persist after closing and reopening.

See the release `VALIDATION.md` for final counts and the data-comparison result. Other third-party modules are outside this migration's validation scope.

## Install and rollback

Close Foundry before replacing files. Preserve the whole world and the old system/module directories together.

For this workspace the baseline backup is `Backups/mausritter-v14-2026-09-19/Data`, containing `systems/mausritter`, `modules/mausritter-item-tooltips`, `modules/mausritter-condition-image` and `worlds/mousetest`.

For an existing installation, copy `dist` code/assets into `Data/systems/mausritter` **excluding `packs`**, remove the obsolete `Data/systems/mausritter/template.json` after backing it up, and copy the two module packages into their existing directories. Merely copying over the previous installation leaves that file behind and still produces the setup warning. Existing pack edits are retained; the GM migration updates only recognized original macros and saved sheet selections. For a fresh installation, extract the full system archive into `Data/systems/mausritter`, including its compendia. Restart Foundry and sign in as GM to apply the one-time migrations.

The additional pre-patch system backup is `Backups/mausritter-data-models-2026-09-20/mausritter`. To undo only local.2, stop Foundry and restore that complete system directory. This patch does not rewrite world or compendium databases.

The pre-local.3 system backup is `Backups/mausritter-spell-casting-2026-09-20/mausritter`. To undo the spell feature, close Foundry and restore its code/assets excluding `packs`. Existing world data and compendia are untouched by installation; usage marks made while playing remain normal Item data.

The pre-local.4 system backup is `Backups/mausritter-remaining-power-2026-09-21/mausritter`. Restore its code/assets excluding `packs` with Foundry closed to undo only the remaining-uses setting.

The pre-local.5 system backup is `Backups/mausritter-power-slider-2026-09-21/mausritter`. Restore its code/assets excluding `packs` with Foundry closed to undo only the power slider.

To roll back, close Foundry, move the current four directories aside, and restore the corresponding complete backup directories to the same locations. Restore the world and package versions together. Do not merge LevelDB files from different snapshots. Restoring the world snapshot also reverses changes made after the backup, so retain the moved-aside copy if later play data needs recovery.

This is a maintained local fork. Its manifests intentionally omit upstream update/download URLs to avoid replacing local changes with an upstream release. Upstream and artwork attribution remain in README.md.
