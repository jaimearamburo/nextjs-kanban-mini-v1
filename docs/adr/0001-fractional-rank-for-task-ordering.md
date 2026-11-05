# Fractional rank for task ordering

Tasks are ordered within a Status by a fractional-index string Rank (LexoRank-style), so a drag-and-drop move rewrites only the moved Task, never its neighbours. This keeps concurrent moves by different Guests from conflicting and makes "drop between A and B" a single-row update. Integer positions were rejected because every insert would renumber the column. Sorting by creation date was rejected because it can't express a user-chosen order. Ordering was put in from day one because adding it later would mean a migration and reworking every move.
