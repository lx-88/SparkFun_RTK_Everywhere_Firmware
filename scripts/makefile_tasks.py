"""
Custom PlatformIO tasks that wrap the Arduino CLI + Makefile build system.

This allows you to use 'pio run -t arduino_build' etc. from within PlatformIO
while actually using the working makefile build that has IRAM-optimized patches.
"""

Import("env")
import subprocess
import os

def run_make_command(target, source, env, command):
    """Execute a make command in the firmware directory."""
    project_dir = env.get("PROJECT_DIR")
    firmware_dir = os.path.join(project_dir, "Firmware", "RTK_Everywhere")

    print("=" * 70)
    print(f"Running: make {command}")
    print(f"Directory: {firmware_dir}")
    print("=" * 70)

    try:
        result = subprocess.run(
            ["make", command],
            cwd=firmware_dir,
            check=True
        )
        print("=" * 70)
        print(f"✓ make {command} completed successfully!")
        print("=" * 70)
        return 0
    except subprocess.CalledProcessError as e:
        print("=" * 70)
        print(f"✗ make {command} failed with exit code {e.returncode}")
        print("=" * 70)
        env.Exit(1)
    except Exception as e:
        print("=" * 70)
        print(f"✗ Error: {e}")
        print("=" * 70)
        env.Exit(1)

# Add custom tasks
env.AddCustomTarget(
    name="arduino_build",
    dependencies=None,
    actions=lambda target, source, env: run_make_command(target, source, env, "RTK"),
    title="Arduino CLI Build",
    description="Build firmware using Arduino CLI + Makefile (with IRAM optimizations)"
)

env.AddCustomTarget(
    name="arduino_upload",
    dependencies=None,
    actions=lambda target, source, env: run_make_command(target, source, env, "upload_torch"),
    title="Arduino CLI Upload",
    description="Upload firmware to RTK Torch using makefile"
)

env.AddCustomTarget(
    name="arduino_lib_update",
    dependencies=None,
    actions=lambda target, source, env: run_make_command(target, source, env, "lib-update"),
    title="Arduino Library Update",
    description="Install/update Arduino libraries"
)

env.AddCustomTarget(
    name="arduino_patch",
    dependencies=None,
    actions=lambda target, source, env: run_make_command(target, source, env, "patch"),
    title="Apply Patches",
    description="Apply IRAM optimization patches"
)

print("=" * 70)
print("Arduino CLI Build Tasks Available:")
print("  pio run -t arduino_build         # Build with Arduino CLI")
print("  pio run -t arduino_upload        # Upload to device")
print("  pio run -t arduino_lib_update    # Update libraries")
print("  pio run -t arduino_patch         # Apply patches")
print("=" * 70)
