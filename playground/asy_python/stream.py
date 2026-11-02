# /// script
# requires-python = ">=3.12"
# dependencies = ["anthropic", "python-dotenv"]
# ///

# Streaming: the response arrives in pieces (server-sent events) as it's generated.
#
# Good for: long replies, or when a user is watching the screen.
#
# Run:  uv run playground/asy_python/stream.py
# Cost: one small request (same prompt as sync.py, so you can compare timings).

import asyncio
import time

from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()
client = AsyncAnthropic()


async def main():
    start = time.perf_counter()
    first_token_ms = None

    # `async with` opens the stream and closes the connection when the block ends.
    # Events arrive as Claude generates them.
    async with client.messages.stream(
        model="claude-haiku-4-5",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "In 5 bullet points, how should I monitor 3 VMs on a Proxmox homelab?"},
        ],
    ) as stream:
        # `async for` = loop over things that arrive over time.
        async for event in stream:
            if event.type == "content_block_delta" and event.delta.type == "text_delta":
                if first_token_ms is None:
                    first_token_ms = round((time.perf_counter() - start) * 1000)
                print(event.delta.text, end="", flush=True)  # print each piece as it arrives

        # The SDK reassembles the pieces into one normal Message for you.
        final = await stream.get_final_message()

    print("\n\n--- metadata ---")
    print("stop_reason     :", final.stop_reason)
    print("output tokens   :", final.usage.output_tokens)
    print("first text after:", first_token_ms, "ms  ← what the user feels")
    print("total time      :", round((time.perf_counter() - start) * 1000), "ms  ← about the same as sync")

    # 🤔 Compare with sync.py. Did streaming make the TOTAL time shorter?
    #    (Check the exam trap in your notes before answering.)
    # 🤔 Uncomment the lines below to see every raw event type the server sends.
    # async with client.messages.stream(model="claude-haiku-4-5", max_tokens=50, messages=[{"role": "user", "content": "hi"}]) as raw:
    #     async for event in raw:
    #         print(event.type)


asyncio.run(main())
