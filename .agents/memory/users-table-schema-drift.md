---
name: users table schema drift
description: Schema created via create_all never drops stale columns; orphaned NOT NULL columns silently break inserts.
---
Tables are created with `Base.metadata.create_all`, which only ever *adds missing tables* — it never adds, drops, or alters columns on a table that already exists. So once a model's columns change, every existing DB (dev and prod) keeps the old shape until someone runs a manual `ALTER TABLE`.

**Why this bites:** a column the model no longer declares but that remains `NOT NULL` in the live table makes every model-driven INSERT fail with `NotNullViolation`, even though the code looks correct. Seed/admin rows written before the model changed can mask it, so the failure only shows up when a new code path first inserts a row.

**How to apply:** if account/user creation 500s with a NotNullViolation on a column absent from the model, inspect the live table (`inspect(engine).get_columns(...)`) and reconcile by hand — drop the orphaned column (or make it nullable). Remember `create_all` will not do this for you, and **production needs the same manual migration** as dev.
