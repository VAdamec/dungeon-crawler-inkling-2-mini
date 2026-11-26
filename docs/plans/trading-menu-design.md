# Trading menu design

Updated 2026-11-26. **Canonical design:** [Market transactions, selected-item buying/selling and reversible cart](2026-11-26-market-transactions-design.md).

The user chose **preview cart → explicit Confirm**; Cancel/Esc discards everything. This supersedes the earlier draft's ambiguous legacy bypass, commit/log and equipment-HP guidance. M1 pure draft/economy core is implemented ([evidence](../reviews/2026-11-26-m1-market/README.md)); M2 player UI/confirmed commits are also complete ([evidence](../reviews/2026-11-26-m2-market/README.md)); M3 integration/recovery is complete within [recorded acceptance](../reviews/2026-11-26-m3-market/README.md); native GR-09 remains unverified. The former live-mutation prototype has been replaced.

The design covers the existing town Store and dungeon merchants, selected stock/equipment rows, pure price/stat previews, provisional sale proceeds, Undo/Reset, atomic validated commit, lifecycle/focus/clock safety, existing save persistence and targeted regressions. It does not add a gear backpack, new stock generation, arbitrary player teleportation or new companion combat balance.

[Coordinated phase/task plan](implementation-plan.md) · [Local LLM execution prompt](../prompts/2026-11-26-companions-travel-trading-local-llm.md).
