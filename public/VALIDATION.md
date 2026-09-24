# v14.367 migration validation

## Spell power slider: 0.7.0-local.5

Validated on 21 September 2026. The Node suite passed (7/7). The live Foundry 14.367 check opens the actual power dialog, verifies limits of 1 and 3, moves the native slider, confirms the number updates on the `input` event, and submits the dialog to verify the selected value reaches the roll. Existing power-cap settings and automatic usage marks continue to apply.

The release is `mausritter-0.7.0-local.5.zip`. The previous system is backed up at `Backups/mausritter-power-slider-2026-09-21/mausritter`; installation verification is recorded in `Validation/install-power-slider-result.json`. No settings or data migration were added.

## Remaining spell power: 0.7.0-local.4

The **7/7 Node checks and 27/27 live integration checks passed**, with the live run completed on 21 September 2026 in isolated Foundry 14.367. Checks cover all four combinations of the remaining-uses limit and exhaustion block, the dialog limit of 1 for a spell with 2 of 3 uses marked, restoring power 3 when the new limit is disabled, and saved inventory marks. Zero remaining uses blocks casting whenever the remaining-uses setting is enabled. Node checks also cover changed settings/marks while the power dialog is open and casting again after clearing a mark.

**Limit spell power to remaining uses** is enabled by default in **Configure Settings → Mausritter**. The build is packaged as `mausritter-0.7.0-local.4.zip`; installation verification is recorded in `Validation/install-remaining-power-result.json`. The previous system is backed up at `Backups/mausritter-remaining-power-2026-09-21/mausritter`. No world or compendium migration is required.

## Spell casting: 0.7.0-local.3

Validated on 20 September 2026: **7/7 Node checks and 27/27 live integration checks passed** in the isolated Foundry 14.367 world on port 30001. The live run included Item Tooltips, Condition Image, JSON Importer, Status Weaver and Dice So Nice.

Spell power is limited to total maximum usage, even with partially marked uses. Results of 4, 5 and 6 add marks, capped at the maximum, and the inventory/chat reflect saved usage. The world setting **Block casting exhausted spells** defaults to enabled; disabling it allows casting at full marks while retaining the power cap. Live checks covered both setting states, actual embedded Item updates, native numeric input limits and sheet refresh. The Node check also covers all six die faces, cancellation, invalid power/maxima, changed/deleted items and failed writes. A no-change Item update returns no document in Foundry; full spells now skip that unnecessary update.

Build and release package: `mausritter-0.7.0-local.3.zip`. The previous installed system is backed up at `Backups/mausritter-spell-casting-2026-09-20/mausritter`; installation details and protected-file hashes are recorded in `Validation/install-spell-casting-result.json`. No migration or bulk data rewrite is needed.

## Earlier migration and data-model validation

Validated locally on 19â€“20 September 2026 using Foundry 14.367 and an isolated copy of MouseTest on port 30001.

| Check | Result |
| --- | --- |
| Node regression checks | 6/6 passed, including actual v14 data fields and every editable sheet field |
| Foundry with modules disabled | 22/22 passed |
| Foundry with the five selected integrations | 26/26 passed |
| Administrator login without a loaded world | Package Warnings (0): You have no warnings! |
| V1 / system deprecation warnings in final world validation | None observed |
| Data-model defaults | All ten serialized defaults match the old template |
| Existing Actor/Item data through the new models | All saved values retained in 192 world and 146 compendium records |
| Browser edit of notes, save, close and reopen | Saved text retained |
| Character sheet appearance | Existing layout, artwork and inventory cards retained; readable inputs in dark Foundry UI |
| Bundled compendia | All eight databases opened; five macros audited, with the three obsolete commands migrated |
| Existing world data comparison | 767 original records preserved across seven collections |
| Installed package files | 158 files copied and SHA-256 verified; obsolete template removed after backup |
| Existing world and compendium files during installation | All 181 protected files byte-identical before/after |

The 767 records include embedded records: 50 Actor/owned-item records, 142 world Items, 115 Scene/embedded records, 5 Journal records, 11 Folders, 439 RollTable/result records and 5 Macros. The comparison permits only known sheet ID/unchanged original macro replacements and Foundry's modification/version metadata. All original gameplay content, inventory state, notes and identities match.

The local.1 release missed the deprecated `template.json` warning emitted during setup. Version local.2 removes that file and registers native TypeDataModels plus manifest document types. The exact reported flow was repeated: sign in as the Aomi administrator before launching any world, then inspect Package Warnings. The test world was subsequently launched and both suites rerun. The data comparison above was repeated against a fresh post-patch world snapshot.

Checks also cover hireling level/XP/grit, spell cost, the optional equipped flag, and preservation of additional imported data while saving known fields. These sheet fields were not all declared in the old template. Optional fields add no serialized defaults. The tooltip test closes fixture sheets before changing tooltip direction, avoiding competing automatic rerenders during simulated hover. Core minimum-window-size notices occurred when the browser pane resized; no system deprecation warning was observed in the final run.

The integration suite enabled Mausritter Item Tooltips, Condition Image, JSON Importer, Status Weaver and Dice So Nice. It covers tooltip modes and cleanup, all six imported item types, bidirectional condition/status synchronization across inventory transfers, and receipt of native roll messages by Dice So Nice. It does not certify unrelated third-party modules or simulate a separate remote player's browser.

Read-only compendium behavior, destination/source permission guards and failed transfer safety were checked. The UI review verified native rich-text editing. Core lifecycle errors seen during early test-message deletion were caused by deleting a message during Foundry's notification animation; the final runner retains marked test messages for inspection and showed no such errors.

## Evidence in this workspace

- `Validation/audit/results.json`: offline database comparison and pack counts.
- `Validation/audit/data-models-result.json`: ten default comparisons and 338 existing Actor/Item model checks.
- `Validation/install-v14-result.json`: installed-file hashes and protected-file preservation result.
- `Source/mausritter-v14/tests/in-foundry.mjs`: rerunnable isolated-world checks.
- `Source/mausritter-v14/tests/migration.test.mjs`: Node checks.
- `Source/mausritter-v14/tests/data-models.test.mjs`: checks using Foundry's native v14 model implementation.
- `Releases/zip/mausritter-v14-SHA256SUMS.txt`: package checksums.

Installed system version: `0.7.0-local.2`; both updated add-ons remain `1.1.0-local.1`. The installed JavaScript matches the runtime-tested build. Foundry is stopped. On the next GM login, any pending one-time sheet/macro migration runs against that world. Existing pack databases were preserved during installation. The data-model patch introduces no visual changes and does not perform a bulk world rewrite.

The baseline backup and complete rollback procedure are documented in [MIGRATION.md](MIGRATION.md). The validation copy is separate from the installed world; its generated fixtures and selected test module configuration were not copied into the real installation.
