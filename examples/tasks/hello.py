"""
Example Aido task — hello world.

This task demonstrates the basic structure:
- Read from /inputs (read-only)
- Write results to /outputs
- Print to stdout (captured automatically)
"""

import json
import os
from datetime import datetime, timezone


def main():
    print("Hello from Aido!")
    print(f"Running at: {datetime.now(timezone.utc).isoformat()}")

    # List available inputs
    input_dir = "/inputs"
    if os.path.exists(input_dir):
        files = os.listdir(input_dir)
        print(f"Found {len(files)} input file(s): {files}")
    else:
        print("No inputs directory found (running outside sandbox?)")

    # Write output
    output_dir = "/outputs"
    os.makedirs(output_dir, exist_ok=True)

    result = {
        "status": "success",
        "message": "Hello from Aido!",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    output_path = os.path.join(output_dir, "result.json")
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Output written to {output_path}")


if __name__ == "__main__":
    main()
