# /// script
# requires-python = ">=3.12"
# dependencies = ["anthropic", "python-dotenv"]
# ///

# Synchronous: send the request, wait for the WHOLE response, then act on it.
#
# Good for: short replies, backend jobs where no one is watching.
#
# Run:  uv run playground/asy_python/sync.py
# Cost: one small request.

import asyncio
import time

from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()
client = AsyncAnthropic()  # reads ANTHROPIC_API_KEY from .env


async def main():
    start = time.perf_counter()

    # `await` pauses here until the full message has arrived. Nothing prints until then.
    res = await client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "In 5 bullet points, how should I monitor 3 VMs on a Proxmox homelab?"},
        ],
    )

    ms = round((time.perf_counter() - start) * 1000)

    for block in res.content:
        if block.type == "text":
            print(block.text)

    print("\n--- metadata ---")
    print("stop_reason  :", res.stop_reason)
    print("input tokens :", res.usage.input_tokens)
    print("output tokens:", res.usage.output_tokens)
    print("total time   :", ms, "ms  (and you saw nothing until the end)")

    # 🤔 Change max_tokens to 50 and re-run. What's the stop_reason now,
    #    and what would your code need to do about it?


asyncio.run(main())
