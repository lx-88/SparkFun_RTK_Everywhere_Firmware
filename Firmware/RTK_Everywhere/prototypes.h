// prototypes.h
// Forward declarations for functions defined in .ino files
// This is needed for PlatformIO since it doesn't automatically create prototypes like Arduino IDE
// See: https://docs.platformio.org/en/latest/frameworks/arduino.html#arduino-ino-to-cpp-converter

#ifndef PROTOTYPES_H
#define PROTOTYPES_H

#include <Arduino.h>
#include <WiFi.h>
#include <vector>

// Note: CORRECTION_ID_T, NetPriority_t, and SystemState are defined in settings.h
// which is included before this file

// From support.ino
const char *getTimeStamp();
void printTimeStamp(bool always = false);

// From System.ino
void *rtkMalloc(size_t sizeInBytes, const char *text);
const char *getHpaUnits(double hpa, char *buffer, int length, int decimals, bool limit);

// From menuCorrectionsPriorities.ino
const char *correctionGetName(CORRECTION_ID_T id);

// From menuCommands.ino
const char *commandGetName(int stringIndex, int rtkIndex);

// From menuFirmware.ino
const char *printRtkFirmwareVersion();
const char *printGnssModuleInfo();
const char *otaGetUrl();
const char *otaStateNameGet(uint8_t state, char *string);

// From menuPP.ino
const char *printDeviceId();
const char *printDateFromGPSEpoch(long long gpsEpoch);
const char *printDateFromUnixEpoch(long long unixEpoch);
const char *printDaysFromDuration(long long duration);

// From PointPerfectLibrary.ino - conditionally compiled
// Note: PPLReturnStatusToStr is declared in PointPerfectLibrary.ino
// We cannot forward-declare it here because ePPL_ReturnStatus type
// is not available until PPL_PublicInterface.h is included later

// From WiFi.ino
const char *wifiPrintState(wl_status_t wifiStatus);
const char *wifiSoftApGetSsid();

// From Network.ino
const uint8_t *networkGetMacAddress();
const char *networkGetNameByPriority(NetPriority_t priority);

// From NVM.ino
char *skipSpace(char *str);

// Note: Display.ino and States.ino prototypes requiring icon types are declared
// in prototypes_display.h which is included after icons.h

#endif // PROTOTYPES_H
