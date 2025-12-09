"""
Custom PlatformIO build script that uses Arduino CLI instead of the native PlatformIO builder.

This allows us to use the working Arduino CLI + Makefile build system from within PlatformIO,
giving us IDE integration while using the ESP-IDF 5.1 libraries that have the IRAM-optimized patches.
"""

Import("env")
import subprocess
import os
import sys

def build_with_arduino_cli(*args, **kwargs):
    """
    Build using Arduino CLI and makefile instead of PlatformIO's native builder.
    """
    print("=" * 70)
    print("Building with Arduino CLI (using makefile)...")
    print("=" * 70)

    # Get project directory
    project_dir = env.get("PROJECT_DIR")
    firmware_dir = os.path.join(project_dir, "Firmware", "RTK_Everywhere")

    # Change to firmware directory
    original_dir = os.getcwd()

    try:
        os.chdir(firmware_dir)
        print(f"Working directory: {os.getcwd()}")

        # Run make RTK
        print("\nRunning: make RTK")
        print("-" * 70)

        result = subprocess.run(
            ["make", "RTK"],
            check=True,
            capture_output=False,  # Show output in real-time
            text=True
        )

        print("-" * 70)
        print("Build completed successfully!")
        print("=" * 70)

        # Copy the built firmware to PlatformIO's expected location
        build_dir = os.path.join(firmware_dir, "build", "esp32.esp32.esp32")
        pio_build_dir = os.path.join(project_dir, ".pio", "build", "rtk_torch")

        # Create PlatformIO build directory if it doesn't exist
        os.makedirs(pio_build_dir, exist_ok=True)

        # Copy the binary
        src_bin = os.path.join(build_dir, "RTK_Everywhere.ino.bin")
        dst_bin = os.path.join(pio_build_dir, "firmware.bin")

        if os.path.exists(src_bin):
            import shutil
            shutil.copy2(src_bin, dst_bin)
            print(f"\nCopied firmware.bin to: {dst_bin}")

            # Also copy the ELF file if it exists
            src_elf = os.path.join(build_dir, "RTK_Everywhere.ino.elf")
            dst_elf = os.path.join(pio_build_dir, "firmware.elf")
            if os.path.exists(src_elf):
                shutil.copy2(src_elf, dst_elf)
                print(f"Copied firmware.elf to: {dst_elf}")

        return 0

    except subprocess.CalledProcessError as e:
        print("-" * 70)
        print(f"Build failed with exit code {e.returncode}")
        print("=" * 70)
        sys.exit(1)

    except Exception as e:
        print("-" * 70)
        print(f"Build error: {e}")
        print("=" * 70)
        sys.exit(1)

    finally:
        os.chdir(original_dir)

# Replace the default build action with our custom Arduino CLI builder
env.Replace(
    PROGNAME="firmware",
    BUILD_SCRIPT=build_with_arduino_cli
)

# Override the BuildProgram action
env.AddMethod(build_with_arduino_cli, "BuildProgram")
