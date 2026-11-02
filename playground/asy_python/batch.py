# /// script
# requires-python = ">=3.12"
# dependencies = ["anthropic", "python-dotenv"]
# ///

# Message Batches API: submit many requests at once → get an ID → poll → read results.
#
# Good for: offline bulk jobs where no one is waiting. Cheaper per token, but slow
# (most batches finish within an hour, max 24 h).
#
# Run:     uv run playground/asy_python/batch.py                 (creates a new batch, then polls)
# Resume:  uv run playground/asy_python/batch.py msgbatch_...    (polls an existing batch, no new cost)
# Cost:    three tiny requests, at batch pricing.

import asyncio
import sys
from datetime import datetime

from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()
client = AsyncAnthropic()

POLL_EVERY_SECONDS = 30

# One request per log line. custom_id is how you match results back up later.
LOG_LINES = {
    "hermes-a": "hermes-a: heartbeat ok, load 0.4",
    "hermes-b": "hermes-b: qmp socket timeout, VM unresponsive",
    "hermes-c": "hermes-c: disk 94% full, writes slowing",
}


async def create_batch() -> str:
    batch = await client.messages.batches.create(
        requests=[
            {
                "custom_id": vm,
                "params": {
                    "model": "claude-haiku-4-5",
                    "max_tokens": 50,
                    "messages": [
                        {"role": "user", "content": f"Reply with one word: up, down or degraded.\n<log>{line}</log>"},
                    ],
                },
            }
            for vm, line in LOG_LINES.items()
        ],
    )

    print("Created batch:", batch.id)
    print("Status       :", batch.processing_status)
    print(f"(Ctrl+C is fine. Resume later with: uv run playground/asy_python/batch.py {batch.id})\n")
    return batch.id


async def wait_until_ended(batch_id: str):
    while True:
        batch = await client.messages.batches.retrieve(batch_id)
        c = batch.request_counts
        print(
            f"[{datetime.now():%H:%M:%S}] {batch.processing_status}",
            f"processing={c.processing} succeeded={c.succeeded} errored={c.errored}",
        )
        if batch.processing_status == "ended":
            return
        await asyncio.sleep(POLL_EVERY_SECONDS)


async def print_results(batch_id: str):
    print("\n--- results ---")
    # Results can come back in ANY order, so always key them by custom_id, never by position.
    async for item in await client.messages.batches.results(batch_id):
        r = item.result
        if r.type == "succeeded":
            block = r.message.content[0] if r.message.content else None
            text = block.text.strip() if block and block.type == "text" else "(no text)"
            print(f"{item.custom_id:<9} → {text}")
        else:
            print(f"{item.custom_id:<9} → {r.type}")  # errored | canceled | expired


async def main():
    existing_id = sys.argv[1] if len(sys.argv) > 1 else None  # the argument after the script name, if any
    batch_id = existing_id or await create_batch()
    await wait_until_ended(batch_id)
    await print_results(batch_id)

    # 🤔 There's no `await` that "waits for the batch". Why does the API make you poll
    #    instead of keeping the connection open like sync.py does?
    # 🤔 Your PII harness (step 03) runs 50 test cases overnight. Batch or asyncio.gather? Why?


asyncio.run(main())
