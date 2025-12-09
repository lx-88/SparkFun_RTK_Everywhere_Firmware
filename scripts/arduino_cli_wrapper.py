"""
Simple wrapper that executes the makefile build using Arduino CLI.
This is added as a post-script to completely bypass PlatformIO's builder.
"""

Import("env")
import subprocess
import os
import sys

# Completely replace the program builder
def build_firmware(target, source, env):
    """Build using make instead of SCons."""
    print("=" * 70)
    print("Building with Arduino CLI (via makefile)...")
    print("=" * 70)

    project_dir = env.get("PROJECT_DIR")
    firmware_dir = os.path.join(project_dir, "Firmware", "RTK_Everywhere")

    # Run make RTK
    try:
        result = subprocess.run(
            ["make", "RTK"],
            cwd=firmware_dir,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        print(result.stdout)
        print("=" * 70)
        print("Build completed successfully!")
        print("=" * 70)
        return 0
    except subprocess.CalledProcessError as e:
        print(e.stdout)
        print("=" * 70)
        print(f"Build failed!")
        print("=" * 70)
        env.Exit(1)
    except Exception as e:
        print(f"Error: {e}")
        env.Exit(1)

# Remove all the default build steps and replace with our custom builder
env.Replace(PROGNAME="firmware")
AlwaysBuild(env.Alias("buildprog", None, build_firmware))

print("=" * 70)
print("Arduino CLI Build Mode Activated")
print("This will use 'make RTK' instead of PlatformIO's native builder")
print("=" * 70)
