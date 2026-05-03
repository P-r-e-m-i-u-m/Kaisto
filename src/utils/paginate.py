from typing import Optional
from dataclasses import dataclass

@dataclass
class PaginationResult:
    items: list
    next_cursor: Optional[str]
    has_more: bool

async def paginate(model, cursor=None, limit=20):
    query = model.select().limit(limit + 1)
    if cursor:
        query = query.where(model.id > cursor)
    items = await query.execute()
    has_more = len(items) > limit
    return PaginationResult(items=items[:limit], next_cursor=str(items[limit-1].id) if has_more else None, has_more=has_more)
# updated: 2026-05-03 build: 1777802369
