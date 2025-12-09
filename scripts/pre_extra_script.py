Import("env")
import os
import shutil

def copy_patched_files(source, target, env):
    """
    Copy patched library files to framework directories before build.
    This mimics the 'make patch' behavior from the Makefile.

    CRITICAL: The Patch directory contains precompiled .a libraries (libbt.a, libmbed*.a)
    that have been optimized to reduce IRAM usage. Without these, the build will overflow IRAM!
    """
    print("=" * 60)
    print("Applying RTK Everywhere firmware patches...")
    print("=" * 60)

    # Get PlatformIO package directories
    platform_packages = env.PioPlatform().get_package_dir("framework-arduinoespressif32")
    libs_package = env.PioPlatform().get_package_dir("framework-arduinoespressif32-libs")

    if not platform_packages:
        print("WARNING: Could not find framework-arduinoespressif32 package directory")
        return

    # Source patch directory (relative to project root)
    project_dir = env.get("PROJECT_DIR")
    patch_src = os.path.join(project_dir, "Firmware", "RTK_Everywhere", "Patch")

    if not os.path.exists(patch_src):
        print(f"WARNING: Patch directory not found: {patch_src}")
        return

    # Destination for NetworkEvents patch files
    network_lib_dst = os.path.join(platform_packages, "libraries", "Network", "src")

    # Destination for library .a files
    esp32_lib_dst = None
    if libs_package:
        esp32_lib_dst = os.path.join(libs_package, "esp32", "lib")
        print(f"Found libs package: {esp32_lib_dst}")
    else:
        print("WARNING: Could not find framework-arduinoespressif32-libs package")

    # Files to patch
    patches = [
        {
            "src": os.path.join(patch_src, "NetworkEvents.h"),
            "dst": os.path.join(network_lib_dst, "NetworkEvents.h"),
            "name": "NetworkEvents.h"
        },
        {
            "src": os.path.join(patch_src, "NetworkEvents.cpp"),
            "dst": os.path.join(network_lib_dst, "NetworkEvents.cpp"),
            "name": "NetworkEvents.cpp"
        }
    ]

    # Add precompiled library patches (CRITICAL for IRAM optimization!)
    if esp32_lib_dst:
        lib_patches = ["libbt.a", "libmbedtls.a", "libmbedtls_2.a", "libmbedcrypto.a", "libmbedx509.a"]
        for lib in lib_patches:
            patches.append({
                "src": os.path.join(patch_src, lib),
                "dst": os.path.join(esp32_lib_dst, lib),
                "name": f"{lib} (IRAM optimized)"
            })

    # Copy patched files
    patched_count = 0
    for patch in patches:
        if os.path.exists(patch["src"]):
            try:
                # Create backup of original file if it doesn't exist
                backup_file = patch["dst"] + ".original"
                if os.path.exists(patch["dst"]) and not os.path.exists(backup_file):
                    shutil.copy2(patch["dst"], backup_file)
                    print(f"  Backed up: {patch['name']}")

                # Copy patched file
                shutil.copy2(patch["src"], patch["dst"])
                print(f"  ✓ Patched: {patch['name']}")
                patched_count += 1
            except Exception as e:
                print(f"  ✗ Failed to patch {patch['name']}: {e}")
        else:
            print(f"  ! Patch file not found: {patch['name']}")

    print(f"\nPatched {patched_count} file(s)")
    print("=" * 60)

# Register the callback to run before build
env.AddPreAction("buildprog", copy_patched_files)
