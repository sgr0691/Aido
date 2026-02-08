#!/usr/bin/env python3
"""
Simple Hello World task for Aido

This demonstrates the basics of an Aido task:
- Reading from inputs (if provided)
- Writing to outputs
- Logging to stdout
- Exiting with status code
"""

import sys
import os
from pathlib import Path
from datetime import datetime


def main():
    print("=" * 50)
    print("Aido Example Task: Hello World (Python)")
    print("=" * 50)
    print()

    # Show environment info
    print(f"Task started at: {datetime.now().isoformat()}")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print()

    # Check for inputs
    inputs_dir = Path("/inputs")
    if inputs_dir.exists():
        print("📁 Inputs available:")
        for item in inputs_dir.rglob("*"):
            if item.is_file():
                print(f"  - {item.relative_to(inputs_dir)}")
    else:
        print("📁 No inputs directory found (running in local mode)")
    print()

    # Create output
    outputs_dir = Path("/outputs")
    if not outputs_dir.exists():
        outputs_dir = Path("./outputs")
        outputs_dir.mkdir(exist_ok=True)

    output_file = outputs_dir / "hello.txt"

    message = f"""Hello from Aido!

Generated at: {datetime.now().isoformat()}
Python version: {sys.version.split()[0]}

This is a simple example task that demonstrates:
✓ Execution in an isolated sandbox
✓ Reading from inputs (if provided)
✓ Writing to outputs
✓ Logging to stdout

Status: SUCCESS
"""

    output_file.write_text(message)
    print(f"✓ Output written to: {output_file}")
    print()

    # Success
    print("=" * 50)
    print("Task completed successfully!")
    print("=" * 50)
    return 0


if __name__ == "__main__":
    sys.exit(main())
