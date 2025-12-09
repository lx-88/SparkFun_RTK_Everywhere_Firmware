// prototypes_display.h
// Forward declarations for Display.ino and States.ino functions
// These require complete type definitions from icons.h, so this file is included after icons.h

#ifndef PROTOTYPES_DISPLAY_H
#define PROTOTYPES_DISPLAY_H

#include "icons.h"
#include <vector>

// Note: displayCoords is already typedef'd in icons.h (line 1809)
// Note: setupButton is already typedef'd in settings.h (line 216)

// From Display.ino
void paintDynamicModel(std::vector<iconPropertyBlinking> *iconList);
void displayWiFiFullIcon(std::vector<iconPropertyBlinking> *iconList, iconPropertyBlinking prop, uint8_t position, uint8_t duty);
void displayWiFiIcon(std::vector<iconPropertyBlinking> *iconList, iconPropertyBlinking prop, uint8_t position, uint8_t duty);
displayCoords paintSIVIcon(std::vector<iconPropertyBlinking> *iconList, const iconProperties *icon, uint8_t duty);
void setBluetoothIcon_OneRadio(std::vector<iconPropertyBlinking> *iconList);
void setBluetoothIcon_TwoRadios(std::vector<iconPropertyBlinking> *iconList);
void setESPNowIcon_TwoRadios(std::vector<iconPropertyBlinking> *iconList);
void setWiFiIcon_TwoRadios(std::vector<iconPropertyBlinking> *iconList);
void setWiFiIcon_ThreeRadios(std::vector<iconPropertyBlinking> *iconList);
void setModeIcon(std::vector<iconPropertyBlinking> *iconList);
void setRadioIcons(std::vector<iconPropertyBlinking> *iconList);
void paintClock(std::vector<iconPropertyBlinking> *iconList, bool blinking);
void paintRTCM(std::vector<iconPropertyBlinking> *iconList);
void displayWebConfig(std::vector<iconPropertyBlinking> &iconPropertyList);
void displayHorizontalAccuracy(std::vector<iconPropertyBlinking> *iconList, const iconProperties *icon, uint8_t duty);
void displayRTKAccuracy(std::vector<iconPropertyBlinking> *iconList, const iconProperties *icon, bool fixed);
void displaySivVsOpenShort(std::vector<iconPropertyBlinking> *iconList);
void displayBaseSiv(std::vector<iconPropertyBlinking> *iconList);
void displayBatteryVsEthernet(std::vector<iconPropertyBlinking> *iconList);
void displayFullIPAddress(std::vector<iconPropertyBlinking> *iconList);
void paintBaseTempSurveyStarted(std::vector<iconPropertyBlinking> *iconList);

// From States.ino
void constructSetupDisplay(std::vector<setupButton> *buttons);

#endif // PROTOTYPES_DISPLAY_H
