import asyncio
import aiohttp

async def fetch_with_retry(url: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    return await response.json()
        except Exception as e:
            if attempt == retries - 1:
                raise e
            await asyncio.sleep(2 ** attempt)
# updated: 2026-07-02 build: 1782991606
