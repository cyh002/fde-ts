// Simulates the ways prefill() in demo.ts can go wrong, using fake responses.
// No API calls, so it's free and each failure happens on demand.
//
// Run:  npm run demo:simulate
// Case 4 crashes on purpose, so the SyntaxError and npm error at the end are expected.

function handle(stopReason: string, text: string) {
  console.log(`\nstop_reason: ${stopReason}, text: ${JSON.stringify(text)}`);

  if (stopReason !== "end_turn") {
    console.log("guard      : Claude didn't finish, skipping the parse");
    return;
  }

  try {
    console.log("parsed     :", JSON.parse("{" + text));
  } catch (err) {
    console.log("try/catch  : not valid JSON");
  }
}

// 1. Everything is fine
handle("end_turn", '"vm": "hermes-b", "status": "down"}');

// 2. Cut off mid-answer: the guard stops it
handle("max_tokens", '"vm": "herm');

// 3. Finished normally but the text isn't JSON: the guard lets it through
handle("end_turn", "I can't classify this log line.");

// 4. What happens with no protection at all
console.log("\nno protection:");
JSON.parse("{" + '"vm": "herm');
console.log("this line never runs");
