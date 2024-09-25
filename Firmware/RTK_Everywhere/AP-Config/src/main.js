var gateway = `ws://${window.location.hostname}:81/ws`;
var websocket;

window.addEventListener('load', onLoad);

function onLoad(event) {
    initWebSocket();
}

function initWebSocket() {
    websocket = new WebSocket(gateway);
    websocket.onmessage = function (msg) {
        parseIncoming(msg.data);
    };
}

function ge(e) {
    return document.getElementById(e);
}

var fixedLat = 0;
var fixedLong = 0;
var platformPrefix = "";
var geodeticLat = 40.01;
var geodeticLon = -105.19;
var geodeticAlt = 1500.1;
var ecefX = -1280206.568;
var ecefY = -4716804.403;
var ecefZ = 4086665.484;
var lastFileName = "";
var fileNumber = 0;
var numberOfFilesSelected = 0;
var selectedFiles = "";
var showingFileList = false;
var obtainedMessageList = false;
var obtainedMessageListBase = false;
var showingMessageRTCMList = false;
var fileTableText = "";
var correctionText = "";
var messageText = "";
var lastMessageType = "";
var lastMessageTypeBase = "";

var recordsECEF = [];
var recordsGeodetic = [];
var fullPageUpdate = false;

var resetTimeout;
var sendDataTimeout;
var checkNewFirmwareTimeout;
var getNewFirmwareTimeout;

const numCorrectionsSources = 7;
var correctionsSourceNames = [];
var correctionsSourcePriorities = [];

const CoordinateTypes = {
    COORDINATE_INPUT_TYPE_DD: 0, //Default DD.ddddddddd
    COORDINATE_INPUT_TYPE_DDMM: 1, //DDMM.mmmmm
    COORDINATE_INPUT_TYPE_DD_MM: 2, //DD MM.mmmmm
    COORDINATE_INPUT_TYPE_DD_MM_DASH: 3, //DD-MM.mmmmm
    COORDINATE_INPUT_TYPE_DD_MM_SYMBOL: 4, //DD°MM.mmmmmmm'
    COORDINATE_INPUT_TYPE_DDMMSS: 5, //DD MM SS.ssssss
    COORDINATE_INPUT_TYPE_DD_MM_SS: 6, //DD MM SS.ssssss
    COORDINATE_INPUT_TYPE_DD_MM_SS_DASH: 7, //DD-MM-SS.ssssss
    COORDINATE_INPUT_TYPE_DD_MM_SS_SYMBOL: 8, //DD°MM'SS.ssssss"
    COORDINATE_INPUT_TYPE_DDMMSS_NO_DECIMAL: 9, //DDMMSS - No decimal
    COORDINATE_INPUT_TYPE_DD_MM_SS_NO_DECIMAL: 10, //DD MM SS - No decimal
    COORDINATE_INPUT_TYPE_DD_MM_SS_DASH_NO_DECIMAL: 11, //DD-MM-SS - No decimal
    COORDINATE_INPUT_TYPE_INVALID_UNKNOWN: 12,
}

var convertedCoordinate = 0.0;
var coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD;

function parseIncoming(msg) {
    //console.log("Incoming message: " + msg);

    var data = msg.split(',');
    for (let x = 0; x < data.length - 1; x += 2) {
        var id = data[x];
        var val = data[x + 1];
        //console.log("id: " + id + ", val: " + val);

        //Special commands
        if (id.includes("sdMounted")) {
            //Turn on/off SD area
            if (val == "false") {
                hide("fileManager");
            }
            else if (val == "true") {
                show("fileManager");
            }
        }
        else if (id == "platformPrefix") {
            platformPrefix = val;
            document.title = "RTK " + platformPrefix + " Setup";
            fullPageUpdate = true;
            correctionText = "";

            if (platformPrefix == "EVK") {
                show("baseConfig");
                show("ppConfig");
                show("ethernetConfig");
                show("ntpConfig");
                show("portsConfig");
                hide("externalPortOptions");
                show("logToSDCard");
                hide("galileoHasSetting");
                hide("tiltConfig");
                hide("beeperControl");
                show("useAssistNowCheckbox");
            }
            else if (platformPrefix == "Facet v2") {
                show("baseConfig");
                show("ppConfig");
                hide("ethernetConfig");
                hide("ntpConfig");
                show("portsConfig");
                show("externalPortOptions");
                show("logToSDCard");
                hide("galileoHasSetting");
                hide("tiltConfig");
                hide("beeperControl");
                show("useAssistNowCheckbox");
            }
            else if (platformPrefix == "Facet mosaic") {
                show("baseConfig");
                show("ppConfig");
                hide("ethernetConfig");
                hide("ntpConfig");
                show("portsConfig");
                show("externalPortOptions");
                show("logToSDCard");
                hide("tiltConfig");
                hide("beeperControl");
                hide("useAssistNowCheckbox");
            }
            else if (platformPrefix == "Torch") {
                show("baseConfig");
                show("ppConfig");
                hide("ethernetConfig");
                hide("ntpConfig");
                show("portsConfig");
                hide("externalPortOptions");

                hide("logToSDCard");

                hide("constellationSbas"); //Not supported on UM980

                show("useAssistNowCheckbox"); //Does the PPL use MGA? Not sure...

                select = ge("dynamicModel");
                let newOption = new Option('Survey', '0');
                select.add(newOption, undefined);
                newOption = new Option('UAV', '1');
                select.add(newOption, undefined);
                newOption = new Option('Automotive', '2');
                select.add(newOption, undefined);
            }


        }
        else if (id.includes("gnssFirmwareVersionInt")) {
            //Modify settings due to firmware limitations
            if ((platformPrefix == "EVK") || (platformPrefix == "Facet v2")) {
                select = ge("dynamicModel");
                let newOption = new Option('Portable', '0');
                select.add(newOption, undefined);
                newOption = new Option('Stationary', '2');
                select.add(newOption, undefined);
                newOption = new Option('Pedestrian', '3');
                select.add(newOption, undefined);
                newOption = new Option('Automotive', '4');
                select.add(newOption, undefined);
                newOption = new Option('Sea', '5');
                select.add(newOption, undefined);
                newOption = new Option('Airborne 1g', '6');
                select.add(newOption, undefined);
                newOption = new Option('Airborne 2g', '7');
                select.add(newOption, undefined);
                newOption = new Option('Airborne 4g', '8');
                select.add(newOption, undefined);
                newOption = new Option('Wrist', '9');
                select.add(newOption, undefined);
                newOption = new Option('Bike', '10');
                select.add(newOption, undefined);
                if (val >= 121) {
                    select = ge("dynamicModel");
                    let newOption = new Option('Mower', '11');
                    select.add(newOption, undefined);
                    newOption = new Option('E-Scooter', '12');
                    select.add(newOption, undefined);
                }
            }
        }
        //Strings generated by RTK unit
        else if (id.includes("sdFreeSpace")
            || id.includes("sdSize")
            || id.includes("hardwareID")
            || id.includes("gnssFirmwareVersion")
            || id.includes("daysRemaining")
            || id.includes("profile0Name")
            || id.includes("profile1Name")
            || id.includes("profile2Name")
            || id.includes("profile3Name")
            || id.includes("profile4Name")
            || id.includes("profile5Name")
            || id.includes("profile6Name")
            || id.includes("profile7Name")
            || id.includes("radioMAC")
            || id.includes("deviceBTID")
            || id.includes("logFileName")
            || id.includes("batteryPercent")
        ) {
            ge(id).innerHTML = val;
        }
        else if (id.includes("rtkFirmwareVersion")) {
            ge("rtkFirmwareVersion").innerHTML = val;
            ge("rtkFirmwareVersionUpgrade").innerHTML = val;
        }
        else if (id.includes("confirmReset")) {
            resetComplete();
        }
        else if (id.includes("confirmDataReceipt")) {
            confirmDataReceipt();
        }

        else if (id.includes("profileNumber")) {
            currentProfileNumber = val;
            $("input[name=profileRadio][value=" + currentProfileNumber + "]").prop('checked', true);
        }
        else if (id.includes("firmwareUploadComplete")) {
            firmwareUploadComplete();
        }
        else if (id.includes("firmwareUploadStatus")) {
            firmwareUploadStatus(val);
        }
        else if (id.includes("geodeticLat")) {
            geodeticLat = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("geodeticLon")) {
            geodeticLon = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("geodeticAlt")) {
            geodeticAlt = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("ecefX")) {
            ecefX = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("ecefY")) {
            ecefY = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("ecefZ")) {
            ecefZ = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("espnowPeerCount")) {
            if (val > 0)
                ge("peerMACs").innerHTML = "";
        }
        else if (id.includes("espnowPeer_")) {
            if (val[0] != "0" && val[1] != "0") {
                ge("peerMACs").innerHTML += val + "<br>";
            }
        }
        else if (id.includes("stationECEF")) {
            recordsECEF.push(val);
        }
        else if (id.includes("stationGeodetic")) {
            recordsGeodetic.push(val);
        }
        else if (id.includes("fmName")) {
            lastFileName = val;
        }
        else if (id.includes("fmSize")) {
            fileTableText += "<tr align='left'>";
            fileTableText += "<td>" + lastFileName + "</td>";
            fileTableText += "<td>" + val + "</td>";
            fileTableText += "<td><input type='checkbox' id='" + lastFileName + "' name='fileID' class='form-check-input fileManagerCheck'></td>";
            fileTableText += "</tr>";
        }
        else if (id.includes("fmNext")) {
            sendFile();
        }
        else if (id.includes("ubxMessageRate")) { // ubxMessageRate_NMEA_DTM ubxMessageRateBase_RTCM_1005
            var messageName = id;
            var messageRate = val;
            var messageNameLabel = "";

            var messageData = messageName.split('_');
            if (messageData.length >= 3) {
                var messageType = messageData[1]; // ubxMessageRate_NMEA_DTM = NMEA
                if (lastMessageType != messageType) {
                    lastMessageType = messageType;
                    messageText += "<hr>";
                }

                messageNameLabel = messageData[1] + "_" + messageData[2]; // ubxMessageRateBase_RTCM_1005 = RTCM_1005
                if (messageData.length == 4) {
                    messageNameLabel = messageData[1] + "_" + messageData[2] + "_" + messageData[3]; // ubxMessageRate_RTCM_4072_0 = RTCM_4072_0
                }
            }

            messageText += "<div class='form-group row' id='msg" + messageName + "'>";
            messageText += "<label for='" + messageName + "' class='col-sm-4 col-6 col-form-label'>" + messageNameLabel + ":</label>";
            messageText += "<div class='col-sm-4 col-4'><input type='number' class='form-control'";
            messageText += " id='" + messageName + "' value='" + messageRate + "'>";
            messageText += "<p id='" + messageName + "Error' class='inlineError'></p>";
            messageText += "</div></div>";
        }
        else if (id.includes("messageRate")) {
            // messageRateNMEA_GPDTM
            // messageRateRTCMRover_RTCM1001
            // messagRatesRTCMBase_RTCM1001
            var messageName = id;
            var messageRate = parseFloat(val);
            var messageNameLabel = "";

            var messageData = messageName.split('_');
            messageNameLabel = messageData[1];

            messageText += "<div class='form-group row' id='msg" + messageName + "'>";
            messageText += "<label for='" + messageName + "' class='col-sm-4 col-6 col-form-label'>" + messageNameLabel + ":</label>";
            messageText += "<div class='col-sm-4 col-4'><input type='number' class='form-control'";
            messageText += " id='" + messageName + "' value='" + messageRate + "'>";
            messageText += "<p id='" + messageName + "Error' class='inlineError'></p>";
            messageText += "</div></div>";
        }
        else if (id.includes("correctionsPriority")) {
            var correctionName = id;
            var correctionPriority = parseInt(val);
            var correctionData = correctionName.split('_');
            var correctionNameLabel = correctionData[1];

            if (correctionsSourceNames.length < numCorrectionsSources) {
                correctionsSourceNames.push(correctionNameLabel);
                correctionsSourcePriorities.push(correctionPriority);
            }
            else
                console.log("Too many corrections sources");
        }
        else if (id.includes("checkingNewFirmware")) {
            checkingNewFirmware();
        }
        else if (id.includes("newFirmwareVersion")) {
            newFirmwareVersion(val);
        }
        else if (id.includes("gettingNewFirmware")) {
            gettingNewFirmware();
        }
        else if (id.includes("otaFirmwareStatus")) {
            otaFirmwareStatus(val);
        }
        else if (id.includes("batteryIconFileName")) {
            ge("batteryIconFileName").src = val;
        }
        else if (id.includes("coordinateInputType")) {
            coordinateInputType = val;
        }
        else if (id.includes("fixedLat")) {
            fixedLat = val;
        }
        else if (id.includes("fixedLong")) {
            fixedLong = val;
        }
        else if (id.includes("rebootMinutes")) {
            if (val > 0) {
                ge("rebootMinutes").value = val;
                ge("enableAutoReset").checked = true;
                show("enableAutomaticResetDetails");
            }
            else {
                ge("rebootMinutes").value = 0;
                ge("enableAutoReset").checked = false;
                hide("enableAutomaticResetDetails");
            }
        }

        //Convert incoming mm to local meters
        else if (id.includes("antennaHeight_mm")) {
            ge("antennaHeight_m").value = val / 1000.0;
        }

        //Check boxes / radio buttons
        else if (val == "true") {
            try {
                ge(id).checked = true;
            } catch (error) {
                console.log("Issue with ID: " + id);
            }
        }
        else if (val == "false") {
            try {
                ge(id).checked = false;
            } catch (error) {
                console.log("Issue with ID: " + id);
            }
        }

        //All regular input boxes and values
        else {
            try {
                ge(id).value = val;
            } catch (error) {
                console.log("Issue with ID: " + id);
            }
        }
    }
    //console.log("Settings loaded");

    ge("profileChangeMessage").innerHTML = '';
    ge("resetProfileMsg").innerHTML = '';

    //Don't update if all we received was coordinate info
    if (fullPageUpdate == true) {
        fullPageUpdate = false;

        //Force element updates
        ge("measurementRateHz").dispatchEvent(new CustomEvent('change'));
        ge("measurementRateSec").dispatchEvent(new CustomEvent('change'));
        ge("baseTypeSurveyIn").dispatchEvent(new CustomEvent('change'));
        ge("baseTypeFixed").dispatchEvent(new CustomEvent('change'));
        ge("fixedBaseCoordinateTypeECEF").dispatchEvent(new CustomEvent('change'));
        ge("fixedBaseCoordinateTypeGeo").dispatchEvent(new CustomEvent('change'));
        ge("enableNtripServer").dispatchEvent(new CustomEvent('change'));
        ge("enableNtripClient").dispatchEvent(new CustomEvent('change'));
        ge("dataPortChannel").dispatchEvent(new CustomEvent('change'));
        ge("enablePointPerfectCorrections").dispatchEvent(new CustomEvent('change'));
        ge("enableExternalPulse").dispatchEvent(new CustomEvent('change'));
        ge("enableEspNow").dispatchEvent(new CustomEvent('change'));
        ge("antennaPhaseCenter_mm").dispatchEvent(new CustomEvent('change'));
        ge("enableLogging").dispatchEvent(new CustomEvent('change'));
        ge("enableARPLogging").dispatchEvent(new CustomEvent('change'));
        ge("enableAutoFirmwareUpdate").dispatchEvent(new CustomEvent('change'));
        ge("enableAutoReset").dispatchEvent(new CustomEvent('change'));
        ge("useLocalizedDistribution").dispatchEvent(new CustomEvent('change'));

        updateECEFList();
        updateGeodeticList();
        tcpClientBoxes();
        tcpServerBoxes();
        udpBoxes();
        dhcpEthernet();
        updateLatLong();
        updateCorrectionsPriorities();
    }
}

function hide(id) {
    ge(id).style.display = "none";
}

function show(id) {
    ge(id).style.display = "block";
}

//Create CSV of all setting data
function sendData() {
    var settingCSV = "";

    //Input boxes
    var clsElements = document.querySelectorAll(".form-control, .form-dropdown");
    for (let x = 0; x < clsElements.length; x++) {
        settingCSV += clsElements[x].id + "," + clsElements[x].value + ",";
    }

    //Check boxes, radio buttons
    //Remove file manager files
    clsElements = document.querySelectorAll(".form-check-input:not(.fileManagerCheck), .form-radio");
    for (let x = 0; x < clsElements.length; x++) {
        settingCSV += clsElements[x].id + "," + clsElements[x].checked + ",";
    }

    for (let x = 0; x < recordsECEF.length; x++) {
        settingCSV += "stationECEF" + x + ',' + recordsECEF[x] + ",";
    }

    for (let x = 0; x < recordsGeodetic.length; x++) {
        settingCSV += "stationGeodetic" + x + ',' + recordsGeodetic[x] + ",";
    }

    for (let x = 0; x < correctionsSourceNames.length; x++) {
        settingCSV += "correctionsPriority_" + correctionsSourceNames[x] + ',' + correctionsSourcePriorities[x] + ",";
    }

    console.log("Sending: " + settingCSV);
    websocket.send(settingCSV);

    sendDataTimeout = setTimeout(sendData, 2000);
}

function showError(id, errorText) {
    ge(id + 'Error').innerHTML = '<br>Error: ' + errorText;
}
function clearError(id) {
    ge(id + 'Error').innerHTML = '';
}

function showSuccess(id, msg) {
    ge(id + 'Success').innerHTML = '<br>' + msg;
}
function clearSuccess(id) {
    ge(id + 'Success').innerHTML = '';
}

function showMsg(id, msg, error = false) {
    if (error == true) {
        try {
            ge(id).classList.remove('inlineSuccess');
            ge(id).classList.add('inlineError');
        }
        catch { }
    }
    else {
        try {
            ge(id).classList.remove('inlineError');
            ge(id).classList.add('inlineSuccess');
        }
        catch { }
    }
    ge(id).innerHTML = '<br>' + msg;
}
function showMsgError(id, msg) {
    showMsg(id, "Error: " + msg, true);
}
function clearMsg(id, msg) {
    ge(id).innerHTML = '';
}

var errorCount = 0;

function checkMessageValueUBX(id) {
    checkElementValue(id, 0, 255, "Must be between 0 and 255", "collapseGNSSConfigMsg");
}

function checkMessageValueUBXBase(id) {
    checkElementValue(id, 0, 255, "Must be between 0 and 255", "collapseGNSSConfigMsgBase");
}

function checkMessageValueUM980(id) {
    checkElementValue(id, 0, 65, "Must be between 0 and 65", "collapseGNSSConfigMsg");
}

function checkMessageValueUM980Base(id) {
    checkElementValue(id, 0, 65, "Must be between 0 and 65", "collapseGNSSConfigMsgBase");
}

function collapseSection(section, caret) {
    ge(section).classList.remove('show');
    ge(caret).classList.remove('icon-caret-down');
    ge(caret).classList.remove('icon-caret-up');
    ge(caret).classList.add('icon-caret-down');
}

function validateFields() {
    //Collapse all sections
    collapseSection("collapseProfileConfig", "profileCaret");
    collapseSection("collapseGNSSConfig", "gnssCaret");
    collapseSection("collapseGNSSConfigMsg", "gnssMsgCaret");
    collapseSection("collapseBaseConfig", "baseCaret");
    collapseSection("collapseGNSSConfigMsgBase", "baseMsgCaret");
    collapseSection("collapsePPConfig", "pointPerfectCaret");
    collapseSection("collapsePortsConfig", "portsCaret");
    collapseSection("collapseWiFiConfig", "wifiCaret");
    collapseSection("collapseTCPUDPConfig", "tcpUdpCaret");
    collapseSection("collapseRadioConfig", "radioCaret");
    collapseSection("collapseCorrectionsPriorityConfig", "correctionsCaret");
    collapseSection("collapseSystemConfig", "systemCaret");
    collapseSection("collapseEthernetConfig", "ethernetCaret");
    collapseSection("collapseNTPConfig", "ntpCaret");
    collapseSection("collapseFileManager", "fileManagerCaret");

    errorCount = 0;

    //Profile Config
    checkElementString("profileName", 1, 49, "Must be 1 to 49 characters", "collapseProfileConfig");

    //GNSS Config
    checkElementValue("measurementRateHz", 0.00012, 10, "Must be between 0.00012 and 10Hz", "collapseGNSSConfig");
    checkConstellations();

    checkElementValue("minElev", 0, 90, "Must be between 0 and 90", "collapseGNSSConfig");
    checkElementValue("minCNO", 0, 90, "Must be between 0 and 90", "collapseGNSSConfig");

    if (ge("enableNtripClient").checked == true) {
        checkElementString("ntripClientCasterHost", 1, 45, "Must be 1 to 45 characters", "collapseGNSSConfig");
        checkElementValue("ntripClientCasterPort", 1, 99999, "Must be 1 to 99999", "collapseGNSSConfig");
        checkElementString("ntripClientMountPoint", 1, 30, "Must be 1 to 30 characters", "collapseGNSSConfig");
        checkElementCasterUser("ntripClientCasterHost", "ntripClientCasterUser", "rtk2go.com", "User must use their email address", "collapseGNSSConfig");
    }
    // Don't overwrite with the defaults here. User may want to disable NTRIP but not lose the existing settings.
    // else {
    //     clearElement("ntripClientCasterHost", "rtk2go.com");
    //     clearElement("ntripClientCasterPort", 2101);
    //     clearElement("ntripClientMountPoint", "bldr_SparkFun1");
    //     clearElement("ntripClientMountPointPW");
    //     clearElement("ntripClientCasterUser", "test@test.com");
    //     clearElement("ntripClientCasterUserPW", "");
    //     ge("ntripClientTransmitGGA").checked = true;
    // }

    //Check all UBX message boxes
    //match all ids starting with ubxMessageRate_
    if (platformPrefix == "EVK" || platformPrefix == "Facet v2") {
        var ubxMessages = document.querySelectorAll('input[id^=ubxMessageRate_]');
        for (let x = 0; x < ubxMessages.length; x++) {
            var messageName = ubxMessages[x].id;
            checkMessageValueUBX(messageName);
        }
        //match all ids starting with ubxMessageRateBase_
        var ubxMessages = document.querySelectorAll('input[id^=ubxMessageRateBase_]');
        for (let x = 0; x < ubxMessages.length; x++) {
            var messageName = ubxMessages[x].id;
            checkMessageValueUBXBase(messageName);
        }
    }

    //Check all UM980 message boxes
    else if (platformPrefix == "Torch") {
        var messages = document.querySelectorAll('input[id^=messageRateNMEA_]');
        for (let x = 0; x < messages.length; x++) {
            var messageName = messages[x].id;
            checkMessageValueUM980(messageName);
        }
        var messages = document.querySelectorAll('input[id^=messageRateRTCMRover_]');
        for (let x = 0; x < messages.length; x++) {
            var messageName = messages[x].id;
            checkMessageValueUM980(messageName);
        }
        var messages = document.querySelectorAll('input[id^=messageRateRTCMBase_]');
        for (let x = 0; x < messages.length; x++) {
            var messageName = messages[x].id;
            checkMessageValueUM980Base(messageName);
        }
    }

    //Base Config
    if (ge("baseTypeSurveyIn").checked == true) {
        checkElementValue("observationSeconds", 60, 600, "Must be between 60 to 600", "collapseBaseConfig");
        checkElementValue("observationPositionAccuracy", 1, 5.1, "Must be between 1.0 to 5.0", "collapseBaseConfig");

        clearElement("fixedEcefX", -1280206.568);
        clearElement("fixedEcefY", -4716804.403);
        clearElement("fixedEcefZ", 4086665.484);
        clearElement("fixedLatText", 40.09029479);
        clearElement("fixedLongText", -105.18505761);
        clearElement("fixedAltitude", 1560.089);
    }
    else {
        clearElement("observationSeconds", 60);
        clearElement("observationPositionAccuracy", 5.0);

        if (ge("fixedBaseCoordinateTypeECEF").checked == true) {
            clearElement("fixedLatText", 40.09029479);
            clearElement("fixedLongText", -105.18505761);
            clearElement("fixedAltitude", 1560.089);

            checkElementValue("fixedEcefX", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
            checkElementValue("fixedEcefY", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
            checkElementValue("fixedEcefZ", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
        }
        else {
            clearElement("fixedEcefX", -1280206.568);
            clearElement("fixedEcefY", -4716804.403);
            clearElement("fixedEcefZ", 4086665.484);

            checkLatLong(); //Verify Lat/Long input type
            checkElementValue("fixedAltitude", -11034, 8849, "Must be -11034 to 8849", "collapseBaseConfig");

            checkElementValue("antennaHeight_m", -15, 15, "Must be -15 to 15", "collapseBaseConfig");
            checkElementValue("antennaPhaseCenter_mm", -200.0, 200.0, "Must be -200.0 to 200.0", "collapseBaseConfig");
        }
    }

    if (ge("enableNtripServer").checked == true) {
        checkElementString("ntripServerCasterHost_0", 1, 49, "Must be 1 to 49 characters", "ntripServerConfig0");
        checkElementValue("ntripServerCasterPort_0", 1, 99999, "Must be 1 to 99999", "ntripServerConfig0");
        checkElementString("ntripServerCasterUser_0", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig0");
        checkElementString("ntripServerCasterUserPW_0", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig0");
        checkElementString("ntripServerMountPoint_0", 1, 49, "Must be 1 to 49 characters", "ntripServerConfig0");
        checkElementString("ntripServerMountPointPW_0", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig0");
        checkElementString("ntripServerCasterHost_1", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig1");
        checkElementValue("ntripServerCasterPort_1", 0, 99999, "Must be 0 to 99999", "ntripServerConfig1");
        checkElementString("ntripServerCasterUser_1", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig1");
        checkElementString("ntripServerCasterUserPW_1", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig1");
        checkElementString("ntripServerMountPoint_1", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig1");
        checkElementString("ntripServerMountPointPW_1", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig1");
        checkElementString("ntripServerCasterHost_2", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig2");
        checkElementValue("ntripServerCasterPort_2", 0, 99999, "Must be 0 to 99999", "ntripServerConfig2");
        checkElementString("ntripServerCasterUser_2", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig2");
        checkElementString("ntripServerCasterUserPW_2", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig2");
        checkElementString("ntripServerMountPoint_2", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig2");
        checkElementString("ntripServerMountPointPW_2", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig2");
        checkElementString("ntripServerCasterHost_3", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig3");
        checkElementValue("ntripServerCasterPort_3", 0, 99999, "Must be 0 to 99999", "ntripServerConfig3");
        checkElementString("ntripServerCasterUser_3", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig3");
        checkElementString("ntripServerCasterUserPW_3", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig3");
        checkElementString("ntripServerMountPoint_3", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig3");
        checkElementString("ntripServerMountPointPW_3", 0, 49, "Must be 0 to 49 characters", "ntripServerConfig3");
    }
    // Don't overwrite with the defaults here. User may want to disable NTRIP but not lose the existing settings.
    // else {
    //     clearElement("ntripServerCasterHost_0", "rtk2go.com");
    //     clearElement("ntripServerCasterPort_0", 2101);
    //     clearElement("ntripServerCasterUser_0", "test@test.com");
    //     clearElement("ntripServerCasterUserPW_0", "");
    //     clearElement("ntripServerMountPoint_0", "bldr_dwntwn2");
    //     clearElement("ntripServerMountPointPW_0", "WR5wRo4H");
    //     clearElement("ntripServerCasterHost_1", "");
    //     clearElement("ntripServerCasterPort_1", 0);
    //     clearElement("ntripServerCasterUser_1", "");
    //     clearElement("ntripServerCasterUserPW_1", "");
    //     clearElement("ntripServerMountPoint_1", "");
    //     clearElement("ntripServerMountPointPW_1", "");
    //     clearElement("ntripServerCasterHost_2", "");
    //     clearElement("ntripServerCasterPort_2", 0);
    //     clearElement("ntripServerCasterUser_2", "");
    //     clearElement("ntripServerCasterUserPW_2", "");
    //     clearElement("ntripServerMountPoint_2", "");
    //     clearElement("ntripServerMountPointPW_2", "");
    //     clearElement("ntripServerCasterHost_3", "");
    //     clearElement("ntripServerCasterPort_3", 0);
    //     clearElement("ntripServerCasterUser_3", "");
    //     clearElement("ntripServerCasterUserPW_3", "");
    //     clearElement("ntripServerMountPoint_3", "");
    //     clearElement("ntripServerMountPointPW_3", "");
    // }

    //PointPerfect Config
    if (ge("enablePointPerfectCorrections").checked == true) {
        value = ge("pointPerfectDeviceProfileToken").value;
        if (value.length > 0)
            checkElementString("pointPerfectDeviceProfileToken", 36, 36, "Must be 36 characters", "collapsePPConfig");
    }
    else {
        clearElement("pointPerfectDeviceProfileToken", "");
        ge("autoKeyRenewal").checked = true;
    }

    //WiFi Config
    checkElementString("wifiNetwork_0SSID", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");
    checkElementString("wifiNetwork_0Password", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");
    checkElementString("wifiNetwork_1SSID", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");
    checkElementString("wifiNetwork_1Password", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");
    checkElementString("wifiNetwork_2SSID", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");
    checkElementString("wifiNetwork_2Password", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");
    checkElementString("wifiNetwork_3SSID", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");
    checkElementString("wifiNetwork_3Password", 0, 49, "Must be 0 to 49 characters", "collapseWiFiConfig");

    //TCP/UDP Config
    if (ge("enableTcpClient").checked == true) {
        checkElementValue("tcpClientPort", 1, 65535, "Must be 1 to 65535", "collapseTCPUDPConfig");
        checkElementString("tcpClientHost", 1, 49, "Must be 1 to 49 characters", "collapseTCPUDPConfig");
    }
    if (ge("enableTcpServer").checked == true) {
        checkElementValue("tcpServerPort", 1, 65535, "Must be 1 to 65535", "collapseTCPUDPConfig");
    }
    if (ge("enableUdpServer").checked == true) {
        checkElementValue("udpServerPort", 1, 65535, "Must be 1 to 65535", "collapseTCPUDPConfig");
    }
    //On Ethernet, TCP Client and Server can not be enabled at the same time
    //But, on WiFi, they can be...
    //checkCheckboxMutex("enableTcpClient", "enableTcpServer", "TCP Client and Server can not be enabled at the same time", "collapseTCPUDPConfig");

    //System Config
    if (ge("enableLogging").checked == true) {
        checkElementValue("maxLogTime", 1, 1051200, "Must be 1 to 1,051,200", "collapseSystemConfig");
        checkElementValue("maxLogLength", 1, 1051200, "Must be 1 to 1,051,200", "collapseSystemConfig");
    }
    else {
        clearElement("maxLogTime", 60 * 24);
        clearElement("maxLogLength", 60 * 24);
    }

    if (ge("enableARPLogging").checked == true) {
        checkElementValue("ARPLoggingInterval", 1, 600, "Must be 1 to 600", "collapseSystemConfig");
    }
    else {
        clearElement("ARPLoggingInterval", 10);
    }

    if (ge("enableAutoFirmwareUpdate").checked == true) {
        checkElementValue("autoFirmwareCheckMinutes", 1, 999999, "Must be 1 to 999999", "collapseSystemConfig");
    }
    else {
        clearElement("autoFirmwareCheckMinutes", 0);
    }

    if (ge("enableAutoReset").checked == true) {
        checkElementValue("rebootMinutes", 1, 4294967, "Must be 1 to 4294967", "collapseSystemConfig");
    }
    else {
        clearElement("rebootMinutes", 0); //0 = disable
    }


    //Ethernet
    if (platformPrefix == "EVK") {
        checkElementIPAddress("ethernetIP", "Must be nnn.nnn.nnn.nnn", "collapseEthernetConfig");
        checkElementIPAddress("ethernetDNS", "Must be nnn.nnn.nnn.nnn", "collapseEthernetConfig");
        checkElementIPAddress("ethernetGateway", "Must be nnn.nnn.nnn.nnn", "collapseEthernetConfig");
        checkElementIPAddress("ethernetSubnet", "Must be nnn.nnn.nnn.nnn", "collapseEthernetConfig");
        checkElementValue("ethernetNtpPort", 0, 65535, "Must be 0 to 65535", "collapseEthernetConfig");
    }

    //NTP
    if (platformPrefix == "EVK") {
        checkElementValue("ntpPollExponent", 3, 17, "Must be 3 to 17", "collapseNTPConfig");
        checkElementValue("ntpPrecision", -30, 0, "Must be -30 to 0", "collapseNTPConfig");
        checkElementValue("ntpRootDelay", 0, 10000000, "Must be 0 to 10,000,000", "collapseNTPConfig");
        checkElementValue("ntpRootDispersion", 0, 10000000, "Must be 0 to 10,000,000", "collapseNTPConfig");
        checkElementString("ntpReferenceId", 1, 4, "Must be 1 to 4 chars", "collapseNTPConfig");
    }

    //Port Config
    if (ge("enableExternalPulse").checked == true) {
        checkElementValue("externalPulseTimeBetweenPulse", 1, 60000000, "Must be 1 to 60,000,000", "collapsePortsConfig");
        checkElementValue("externalPulseLength", 1, 60000000, "Must be 1 to 60,000,000", "collapsePortsConfig");
    }

    //Corrections Priorities
    checkElementValue("correctionsSourcesLifetime", 5, 120, "Must be 5 to 120", "collapseCorrectionsPriorityConfig");
}

var currentProfileNumber = 0;

function changeProfile() {
    validateFields();

    if (errorCount == 1) {
        showError('saveBtn', "Please clear " + errorCount + " error");
        clearSuccess('saveBtn');
        $("input[name=profileRadio][value=" + currentProfileNumber + "]").prop('checked', true);
    }
    else if (errorCount > 1) {
        showError('saveBtn', "Please clear " + errorCount + " errors");
        clearSuccess('saveBtn');
        $("input[name=profileRadio][value=" + currentProfileNumber + "]").prop('checked', true);
    }
    else {
        ge("profileChangeMessage").innerHTML = 'Loading. Please wait...';

        currentProfileNumber = document.querySelector('input[name=profileRadio]:checked').value;

        sendData();
        clearError('saveBtn');
        showSuccess('saveBtn', "Saving...");

        websocket.send("setProfile," + currentProfileNumber + ",");

        ge("collapseProfileConfig").classList.add('show');
        collapseSection("collapseGNSSConfig", "gnssCaret");
        collapseSection("collapseGNSSConfigMsg", "gnssMsgCaret");
        collapseSection("collapseBaseConfig", "baseCaret");
        collapseSection("collapseGNSSConfigMsgBase", "baseMsgCaret");
        collapseSection("collapsePPConfig", "pointPerfectCaret");
        collapseSection("collapsePortsConfig", "portsCaret");
        collapseSection("collapseWiFiConfig", "wifiCaret");
        collapseSection("collapseTCPUDPConfig", "tcpUdpCaret");
        collapseSection("collapseCorrectionsPriorityConfig", "correctionsCaret");
        collapseSection("collapseSystemConfig", "systemCaret");
        collapseSection("collapseEthernetConfig", "ethernetCaret");
        collapseSection("collapseNTPConfig", "ntpCaret");
        collapseSection("collapseFileManager", "fileManagerCaret");
        collapseSection("collapseInstrumentConfig", "instrumentCaret");
    }
}

function saveConfig() {
    validateFields();

    if (errorCount == 1) {
        showError('saveBtn', "Please clear " + errorCount + " error");
        clearSuccess('saveBtn');
    }
    else if (errorCount > 1) {
        showError('saveBtn', "Please clear " + errorCount + " errors");
        clearSuccess('saveBtn');
    }
    else {
        sendData();
        clearError('saveBtn');
        showSuccess('saveBtn', "Saving...");
    }

}

function checkConstellations() {
    if ((ge("constellation_GPS").checked == false)
        && (ge("constellation_Galileo").checked == false)
        && (ge("constellation_BeiDou").checked == false)
        && (ge("constellation_GLONASS").checked == false)) {
        ge("collapseGNSSConfig").classList.add('show');
        showError('gnssConstellations', "Please choose one constellation");
        errorCount++;
    }
    else
        clearError("gnssConstellations");
}

function checkBitMapValue(id, min, max, bitMap, errorText, collapseID) {
    value = ge(id).value;
    mask = ge(bitMap).value;
    if ((value < min) || (value > max) || ((mask & (1 << value)) == 0)) {
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else {
        clearError(id);
    }
}

//Check if Lat/Long input types are decipherable
function checkLatLong() {
    var id = "fixedLatText";
    var collapseID = "collapseBaseConfig";
    ge("detectedFormatText").value = "";

    var inputTypeLat = identifyInputType(ge(id).value)
    if (inputTypeLat == CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN) {
        var errorText = "Coordinate format unknown";
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else if ((convertedCoordinate < -180) || (convertedCoordinate > 180)) {
        var errorText = "Must be -180 to 180";
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else
        clearError(id);

    id = "fixedLongText";
    var inputTypeLong = identifyInputType(ge(id).value)
    if (inputTypeLong == CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN) {
        var errorText = "Coordinate format unknown";
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else if ((convertedCoordinate < -180) || (convertedCoordinate > 180)) {
        var errorText = "Must be -180 to 180";
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else
        clearError(id);

    if (inputTypeLong != inputTypeLat) {
        var errorText = "Formats must match";
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
        ge("detectedFormatText").innerHTML = printableInputType(CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN);
    }
    else
        ge("detectedFormatText").innerHTML = printableInputType(inputTypeLat);
}

//Based on the coordinateInputType, format the lat/long text boxes
function updateLatLong() {
    ge("fixedLatText").value = convertInput(fixedLat, coordinateInputType);
    ge("fixedLongText").value = convertInput(fixedLong, coordinateInputType);
    checkLatLong(); //Updates the detected format
}

function checkElementValue(id, min, max, errorText, collapseID) {
    value = ge(id).value;
    if ((value < min) || (value > max) || (value == "")) {
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        if (collapseID == "collapseGNSSConfigMsg") {
            ge("collapseGNSSConfig").classList.add('show');
        }
        if (collapseID == "collapseGNSSConfigMsgBase") {
            ge("collapseBaseConfig").classList.add('show');
        }
        errorCount++;
    }
    else
        clearError(id);
}

function checkElementString(id, min, max, errorText, collapseID) {
    value = ge(id).value;
    if ((value.length < min) || (value.length > max)) {
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        if (collapseID == "ntripServerConfig0") {
            ge("collapseBaseConfig").classList.add('show');
            ge("ntripServerConfig").classList.add('show');
            ge("ntripServerConfig0").classList.add('show');
        }
        else if (collapseID == "ntripServerConfig1") {
            ge("collapseBaseConfig").classList.add('show');
            ge("ntripServerConfig").classList.add('show');
            ge("ntripServerConfig1").classList.add('show');
        }
        else if (collapseID == "ntripServerConfig2") {
            ge("collapseBaseConfig").classList.add('show');
            ge("ntripServerConfig").classList.add('show');
            ge("ntripServerConfig2").classList.add('show');
        }
        else if (collapseID == "ntripServerConfig3") {
            ge("collapseBaseConfig").classList.add('show');
            ge("ntripServerConfig").classList.add('show');
            ge("ntripServerConfig3").classList.add('show');
        }
        else
            ge(collapseID).classList.add('show');
        errorCount++;
    }
    else
        clearError(id);
}

function checkElementIPAddress(id, errorText, collapseID) {
    value = ge(id).value;
    var data = value.split('.');
    if ((data.length != 4)
        || ((data[0] == "") || (isNaN(Number(data[0]))) || (data[0] < 0) || (data[0] > 255))
        || ((data[1] == "") || (isNaN(Number(data[1]))) || (data[1] < 0) || (data[1] > 255))
        || ((data[2] == "") || (isNaN(Number(data[2]))) || (data[2] < 0) || (data[2] > 255))
        || ((data[3] == "") || (isNaN(Number(data[3]))) || (data[3] < 0) || (data[3] > 255))) {
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else
        clearError(id);
}

function checkElementCasterUser(host, user, url, errorText, collapseID) {
    if (ge(host).value.toLowerCase().includes(url)) {
        value = ge(user).value;
        if ((value.length < 1) || (value.length > 49)) {
            ge(user + 'Error').innerHTML = 'Error: ' + errorText;
            ge(collapseID).classList.add('show');
            errorCount++;
        }
        else
            clearError(user);
    }
    else
        clearError(user);
}

function checkCheckboxMutex(id1, id2, errorText, collapseID) {
    if ((ge(id1).checked == true) && (ge(id2).checked == true)) {
        ge(id1 + 'Error').innerHTML = 'Error: ' + errorText;
        ge(id2 + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else {
        clearError(id1);
        clearError(id2);
    }
}

function clearElement(id, value) {
    ge(id).value = value;
    clearError(id);
}

function resetToFactoryDefaults() {
    ge("factoryDefaultsMsg").innerHTML = "Defaults Applied. Please wait for device reset...";
    websocket.send("factoryDefaultReset,1,");
}

function resetToCorrectionsPriorityDefaults() {
    for (let x = 0; x < correctionsSourcePriorities.length; x++) {
        correctionsSourcePriorities[x] = x;
    }

    updateCorrectionsPriorities();
}

function zeroMessages() {
    //match all ids starting with ubxMessageRate_ (not ubxMessageRateBase_)
    var ubxMessages = document.querySelectorAll('input[id^=ubxMessageRate_]');
    for (let x = 0; x < ubxMessages.length; x++) {
        var messageName = ubxMessages[x].id;
        ge(messageName).value = 0;
    }
    //match messageRateNMEA_
    var messages = document.querySelectorAll('input[id^=messageRateNMEA_]');
    for (let x = 0; x < messages.length; x++) {
        var messageName = messages[x].id;
        ge(messageName).value = 0.00;
    }
    //match messageRateRTCMRover_
    messages = document.querySelectorAll('input[id^=messageRateRTCMRover_]');
    for (let x = 0; x < messages.length; x++) {
        var messageName = messages[x].id;
        ge(messageName).value = 0.00;
    }
}

function zeroBaseMessages() {
    //match all ids starting with ubxMessageRateBase_ (not ubxMessageRate_)
    var ubxMessages = document.querySelectorAll('input[id^=ubxMessageRateBase_]');
    for (let x = 0; x < ubxMessages.length; x++) {
        var messageName = ubxMessages[x].id;
        ge(messageName).value = 0;
    }
    //match messageRateRTCMBase_
    var messages = document.querySelectorAll('input[id^=messageRateRTCMBase_]');
    for (let x = 0; x < messages.length; x++) {
        var messageName = messages[x].id;
        ge(messageName).value = 0.00;
    }
}

function resetToSurveyingDefaults() {
    zeroMessages();
    if ((platformPrefix == "EVK") || (platformPrefix == "Facet v2")) {
        ge("ubxMessageRate_NMEA_GGA").value = 1;
        ge("ubxMessageRate_NMEA_GSA").value = 1;
        ge("ubxMessageRate_NMEA_GST").value = 1;
        ge("ubxMessageRate_NMEA_GSV").value = 4;
        ge("ubxMessageRate_NMEA_RMC").value = 1;
    }
    else if (platformPrefix == "Torch") {
        ge("messageRateNMEA_GPGGA").value = 0.5;
        ge("messageRateNMEA_GPGSA").value = 0.5;
        ge("messageRateNMEA_GPGST").value = 0.5;
        ge("messageRateNMEA_GPGSV").value = 1.0;
        ge("messageRateNMEA_GPRMC").value = 0.5;
    }
}
function resetToLoggingDefaults() {
    zeroMessages();
    if ((platformPrefix == "EVK") || (platformPrefix == "Facet v2")) {
        ge("ubxMessageRate_NMEA_GGA").value = 1;
        ge("ubxMessageRate_NMEA_GSA").value = 1;
        ge("ubxMessageRate_NMEA_GST").value = 1;
        ge("ubxMessageRate_NMEA_GSV").value = 4;
        ge("ubxMessageRate_NMEA_RMC").value = 1;

        ge("ubxMessageRate_RXM_RAWX").value = 1;
        ge("ubxMessageRate_RXM_SFRBX").value = 1;
    }
    else if (platformPrefix == "Torch") {
        ge("messageRateNMEA_GPGGA").value = 0.5;
        ge("messageRateNMEA_GPGSA").value = 0.5;
        ge("messageRateNMEA_GPGST").value = 0.5;
        ge("messageRateNMEA_GPGSV").value = 1.0;
        ge("messageRateNMEA_GPRMC").value = 0.5;

        ge("messageRateRTCMRover_RTCM1019").value = 1.0;
        ge("messageRateRTCMRover_RTCM1020").value = 1.0;
        ge("messageRateRTCMRover_RTCM1042").value = 1.0;
        ge("messageRateRTCMRover_RTCM1046").value = 1.0;
    }
}

function resetToRTCMDefaults() {
    zeroBaseMessages();
    if ((platformPrefix == "EVK") || (platformPrefix == "Facet v2")) {
        ge("ubxMessageRateBase_RTCM_1005").value = 1;
        ge("ubxMessageRateBase_RTCM_1074").value = 1;
        ge("ubxMessageRateBase_RTCM_1077").value = 0;
        ge("ubxMessageRateBase_RTCM_1084").value = 1;
        ge("ubxMessageRateBase_RTCM_1087").value = 0;

        ge("ubxMessageRateBase_RTCM_1094").value = 1;
        ge("ubxMessageRateBase_RTCM_1097").value = 0;
        ge("ubxMessageRateBase_RTCM_1124").value = 1;
        ge("ubxMessageRateBase_RTCM_1127").value = 0;
        ge("ubxMessageRateBase_RTCM_1230").value = 10;

        ge("ubxMessageRateBase_RTCM_4072_0").value = 0;
        ge("ubxMessageRateBase_RTCM_4072_1").value = 0;
    }
    else if (platformPrefix == "Torch") {
        ge("messageRateRTCMBase_RTCM1005").value = 1.0;
        ge("messageRateRTCMBase_RTCM1033").value = 10.0;
        ge("messageRateRTCMBase_RTCM1074").value = 1.0;
        ge("messageRateRTCMBase_RTCM1084").value = 1.0;
        ge("messageRateRTCMBase_RTCM1094").value = 1.0;
        ge("messageRateRTCMBase_RTCM1124").value = 1.0;
    }
}

function resetToRTCMLowBandwidth() {
    zeroBaseMessages();
    if ((platformPrefix == "EVK") || (platformPrefix == "Facet v2")) {
        ge("ubxMessageRateBase_RTCM_1005").value = 10;
        ge("ubxMessageRateBase_RTCM_1074").value = 2;
        ge("ubxMessageRateBase_RTCM_1077").value = 0;
        ge("ubxMessageRateBase_RTCM_1084").value = 2;
        ge("ubxMessageRateBase_RTCM_1087").value = 0;

        ge("ubxMessageRateBase_RTCM_1094").value = 2;
        ge("ubxMessageRateBase_RTCM_1097").value = 0;
        ge("ubxMessageRateBase_RTCM_1124").value = 2;
        ge("ubxMessageRateBase_RTCM_1127").value = 0;
        ge("ubxMessageRateBase_RTCM_1230").value = 10;

        ge("ubxMessageRateBase_RTCM_4072_0").value = 0;
        ge("ubxMessageRateBase_RTCM_4072_1").value = 0;
    }
    else if (platformPrefix == "Torch") {
        ge("messageRateRTCMBase_RTCM1005").value = 2.0;
        ge("messageRateRTCMBase_RTCM1033").value = 10.0;
        ge("messageRateRTCMBase_RTCM1074").value = 2.0;
        ge("messageRateRTCMBase_RTCM1084").value = 2.0;
        ge("messageRateRTCMBase_RTCM1094").value = 2.0;
        ge("messageRateRTCMBase_RTCM1124").value = 2.0;
    }
}

function useECEFCoordinates() {
    ge("fixedEcefX").value = ecefX;
    ge("fixedEcefY").value = ecefY;
    ge("fixedEcefZ").value = ecefZ;
}
function useGeodeticCoordinates() {
    ge("fixedLatText").value = geodeticLat;
    ge("fixedLongText").value = geodeticLon;
    ge("fixedHAEAPC").value = geodeticAlt;

    $("input[name=markRadio][value=1]").prop('checked', true);
    $("input[name=markRadio][value=2]").prop('checked', false);

    adjustHAE();
}

function startNewLog() {
    websocket.send("startNewLog,1,");
}

function exitConfig() {
    hide("mainPage");
    show("resetInProcess");

    websocket.send("exitAndReset,1,");
    resetTimeout = setTimeout(exitConfig, 2000);
}

function resetComplete() {
    clearTimeout(resetTimeout);
    hide("mainPage");
    hide("resetInProcess");
    show("resetComplete");
}

//Called when the ESP32 has confirmed receipt of data over websocket from AP config page
function confirmDataReceipt() {
    //Determine which function sent the original data
    if (sendDataTimeout != null) {
        clearTimeout(sendDataTimeout);
        showSuccess('saveBtn', "Success: All Saved");
    }
    else {
        console.log("Unknown owner of confirmDataReceipt");
    }
}

function firmwareUploadWait() {
    var file = ge("submitFirmwareFile").files[0];
    var formdata = new FormData();
    formdata.append("submitFirmwareFile", file);
    var ajax = new XMLHttpRequest();
    ajax.open("POST", "/uploadFirmware");
    ajax.send(formdata);

    ge("firmwareUploadMsg").innerHTML = "<br>Uploading, please wait...";
}

function firmwareUploadStatus(val) {
    ge("firmwareUploadMsg").innerHTML = val;
}

function firmwareUploadComplete() {
    show("firmwareUploadComplete");
    hide("mainPage");
}

function forgetPairedRadios() {
    ge("btnForgetRadiosMsg").innerHTML = "All radios forgotten.";
    ge("peerMACs").innerHTML = "None";
    websocket.send("forgetEspNowPeers,1,");
}

function btnResetProfile() {
    ge("resetProfileMsg").innerHTML = "Resetting profile.";
    websocket.send("resetProfile,1,");
}

document.addEventListener("DOMContentLoaded", (event) => {

    var radios = document.querySelectorAll('input[name=profileRadio]');
    for (var i = 0, max = radios.length; i < max; i++) {
        radios[i].onclick = function () {
            changeProfile();
        }
    }

    ge("measurementRateHz").addEventListener("change", function () {
        ge("measurementRateSec").value = 1.0 / ge("measurementRateHz").value;
    });

    ge("measurementRateSec").addEventListener("change", function () {
        ge("measurementRateHz").value = 1.0 / ge("measurementRateSec").value;
    });

    ge("baseTypeSurveyIn").addEventListener("change", function () {
        if (ge("baseTypeSurveyIn").checked == true) {
            show("surveyInConfig");
            hide("fixedConfig");
        }
    });

    ge("baseTypeFixed").addEventListener("change", function () {
        if (ge("baseTypeFixed").checked == true) {
            show("fixedConfig");
            hide("surveyInConfig");
        }
    });

    ge("fixedBaseCoordinateTypeECEF").addEventListener("change", function () {
        if (ge("fixedBaseCoordinateTypeECEF").checked == true) {
            show("ecefConfig");
            hide("geodeticConfig");
        }
    });

    ge("fixedBaseCoordinateTypeGeo").addEventListener("change", function () {
        if (ge("fixedBaseCoordinateTypeGeo").checked == true) {
            hide("ecefConfig");
            show("geodeticConfig");

            if ((platformPrefix == "Facet mosaic") || (platformPrefix == "Facet v2")) {
                ge("antennaPhaseCenter_mm").value = 61.4;
            }
            else if (platformPrefix == "Torch") {
                ge("antennaPhaseCenter_mm").value = 116.2;
            }
            else {
                ge("antennaPhaseCenter_mm").value = 0.0;
            }
        }
    });

    ge("enableNtripServer").addEventListener("change", function () {
        if (ge("enableNtripServer").checked == true) {
            show("ntripServerConfig");
        }
        else {
            hide("ntripServerConfig");
        }
    });

    ge("enableNtripClient").addEventListener("change", function () {
        if (ge("enableNtripClient").checked == true) {
            show("ntripClientConfig");
        }
        else {
            hide("ntripClientConfig");
        }
    });

    ge("enableFactoryDefaults").addEventListener("change", function () {
        if (ge("enableFactoryDefaults").checked == true) {
            ge("factoryDefaults").disabled = false;
        }
        else {
            ge("factoryDefaults").disabled = true;
        }
    });

    ge("dataPortChannel").addEventListener("change", function () {
        if (ge("dataPortChannel").value == 0) {
            show("dataPortBaudDropdown");
            hide("externalPulseConfig");
        }
        else if (ge("dataPortChannel").value == 1) {
            hide("dataPortBaudDropdown");
            show("externalPulseConfig");
        }
        else {
            hide("dataPortBaudDropdown");
            hide("externalPulseConfig");
        }
    });

    ge("enablePointPerfectCorrections").addEventListener("change", function () {
        if (ge("enablePointPerfectCorrections").checked) {
            show("ppSettingsConfig");
        }
        else {
            hide("ppSettingsConfig");
        }
    });

    ge("useLocalizedDistribution").addEventListener("change", function () {
        if (ge("useLocalizedDistribution").checked) {
            show("localizedDistributionTileLevelDropdown");
        }
        else {
            hide("localizedDistributionTileLevelDropdown");
        }
    });

    ge("enableExternalPulse").addEventListener("change", function () {
        if (ge("enableExternalPulse").checked == true) {
            show("externalPulseConfigDetails");
        }
        else {
            hide("externalPulseConfigDetails");
        }
    });

    ge("enableEspNow").addEventListener("change", function () {
        if (ge("enableEspNow").checked == true) {
            show("radioDetails");
        }
        else {
            hide("radioDetails");
        }
    });

    ge("enableForgetRadios").addEventListener("change", function () {
        if (ge("enableForgetRadios").checked) {
            ge("btnForgetRadios").disabled = false;
        }
        else {
            ge("btnForgetRadios").disabled = true;
        }
    });

    ge("enableLogging").addEventListener("change", function () {
        if (ge("enableLogging").checked) {
            show("enableLoggingDetails");
        }
        else {
            hide("enableLoggingDetails");
        }
    });

    ge("enableARPLogging").addEventListener("change", function () {
        if (ge("enableARPLogging").checked == true) {
            show("enableARPLoggingDetails");
        }
        else {
            hide("enableARPLoggingDetails");
        }
    });

    ge("enableAutoFirmwareUpdate").addEventListener("change", function () {
        if (ge("enableAutoFirmwareUpdate").checked == true) {
            show("enableAutomaticFirmwareUpdateDetails");
        }
        else {
            hide("enableAutomaticFirmwareUpdateDetails");
        }
    });

    ge("enableAutoReset").addEventListener("change", function () {
        if (ge("enableAutoReset").checked == true) {
            show("enableAutomaticResetDetails");
        }
        else {
            hide("enableAutomaticResetDetails");
        }
    });

    ge("fixedAltitude").addEventListener("change", function () {
        adjustHAE();
    });

    ge("antennaHeight_m").addEventListener("change", function () {
        adjustHAE();
    });

    ge("antennaPhaseCenter_mm").addEventListener("change", function () {
        adjustHAE();
    });

    ge("fixedHAEAPC").addEventListener("change", function () {
        adjustHAE();
    });

    for (let y = 0; y < numCorrectionsSources; y++) {
        var buttonName = "corrPrioButton" + y;
        ge(buttonName).addEventListener("click", function () {
            corrPrioButtonClick(y);
        });
    }

})

function updateCorrectionsPriorities() {
    for (let x = 0; x < numCorrectionsSources; x++) {
        for (let y = 0; y < numCorrectionsSources; y++) {
            if (correctionsSourcePriorities[y] == x) {
                var buttonName = "corrPrioButton" + x;
                ge(buttonName).textContent = correctionsSourceNames[y];
            }
        }
    }
}

function corrPrioButtonClick(corrButton) {
    // Increase priority - swap the selected correction source with the next highest
    if (corrButton > 0) {
        var makeMeHigher;
        var makeMeLower;
        for (let x = 0; x < numCorrectionsSources; x++) {
            if (correctionsSourcePriorities[x] == corrButton) {
                makeMeHigher = x;
            }
            if (correctionsSourcePriorities[x] == (corrButton - 1)) {
                makeMeLower = x;
            }
        }
        for (let x = 0; x < numCorrectionsSources; x++) {
            if (x == makeMeHigher) {
                correctionsSourcePriorities[x] -= 1; // Increase
            }
            if (x == makeMeLower) {
                // Note: "correctionsSourcePriorities[x] += 1" only works correctly if
                // correctionsSourcePriorities are int, not string. Use parseInt - see above
                correctionsSourcePriorities[x] += 1; // Decrease
            }
        }
    }
    // If already the highest priority, make it lowest
    else {
        var iAmHighest;
        for (let x = 0; x < numCorrectionsSources; x++) {
            if (correctionsSourcePriorities[x] == 0) { // 0 is Highest
                iAmHighest = x;
                break;
            }
        }
        for (let x = 0; x < numCorrectionsSources; x++) {
            if (x != iAmHighest) {
                correctionsSourcePriorities[x] -= 1; // Increase
            }
            else {
                correctionsSourcePriorities[x] = numCorrectionsSources - 1; // Lowest
            }
        }
    }

    updateCorrectionsPriorities();
}

function addECEF() {
    errorCount = 0;

    nicknameECEF.value = removeBadChars(nicknameECEF.value);

    checkElementString("nicknameECEF", 1, 49, "Must be 1 to 49 characters", "collapseBaseConfig");
    checkElementValue("fixedEcefX", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
    checkElementValue("fixedEcefY", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
    checkElementValue("fixedEcefZ", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");

    if (errorCount == 0) {
        //Check name against the list
        var index = 0;
        for (; index < recordsECEF.length; ++index) {
            var parts = recordsECEF[index].split(' ');
            if (ge("nicknameECEF").value == parts[0]) {
                recordsECEF[index] = nicknameECEF.value + ' ' + fixedEcefX.value + ' ' + fixedEcefY.value + ' ' + fixedEcefZ.value;
                break;
            }
        }
        if (index == recordsECEF.length)
            recordsECEF.push(nicknameECEF.value + ' ' + fixedEcefX.value + ' ' + fixedEcefY.value + ' ' + fixedEcefZ.value);
    }

    updateECEFList();
}

function deleteECEF() {

    var val = ge("StationCoordinatesECEF").value;
    if (val > "") {
        var parts = recordsECEF[val].split(' ');
        var nickName = parts[0];

        if (confirm("Delete location " + nickName + "?") == true) {
            recordsECEF.splice(val, 1);
        }
    }
    updateECEFList();
}

function loadECEF() {
    var val = ge("StationCoordinatesECEF").value;
    if (val > "") {
        var parts = recordsECEF[val].split(' ');
        ge("fixedEcefX").value = parts[1];
        ge("fixedEcefY").value = parts[2];
        ge("fixedEcefZ").value = parts[3];
        ge("nicknameECEF").value = parts[0];
        clearError("fixedEcefX");
        clearError("fixedEcefY");
        clearError("fixedEcefZ");
        clearError("nicknameECEF");
    }
}

//Based on recordsECEF array, update and monospace HTML list
function updateECEFList() {
    ge("StationCoordinatesECEF").length = 0;

    if (recordsECEF.length == 0) {
        hide("StationCoordinatesECEF");
        nicknameECEFText.innerHTML = "No coordinates stored";
    }
    else {
        show("StationCoordinatesECEF");
        nicknameECEFText.innerHTML = "Nickname: X/Y/Z";
        if (recordsECEF.length < 5)
            ge("StationCoordinatesECEF").size = recordsECEF.length;
    }

    for (let index = 0; index < recordsECEF.length; ++index) {
        var option = document.createElement('option');
        option.text = recordsECEF[index];
        option.value = index;
        ge("StationCoordinatesECEF").add(option);
    }

    $("#StationCoordinatesECEF option").each(function () {
        var parts = $(this).text().split(' ');
        var nickname = parts[0].substring(0, 15);
        $(this).text(nickname + ': ' + parts[1] + ' ' + parts[2] + ' ' + parts[3]).text;
    });
}

function addGeodetic() {
    errorCount = 0;

    nicknameGeodetic.value = removeBadChars(nicknameGeodetic.value);

    checkElementString("nicknameGeodetic", 1, 49, "Must be 1 to 49 characters", "collapseBaseConfig");
    checkLatLong();
    checkElementValue("fixedAltitude", -11034, 8849, "Must be -11034 to 8849", "collapseBaseConfig");
    checkElementValue("antennaHeight_m", -15, 15, "Must be -15 to 15", "collapseBaseConfig");
    checkElementValue("antennaPhaseCenter_mm", -200.0, 200.0, "Must be -200.0 to 200.0", "collapseBaseConfig");

    if (errorCount == 0) {
        //Check name against the list
        var index = 0;
        for (; index < recordsGeodetic.length; ++index) {
            var parts = recordsGeodetic[index].split(' ');
            if (ge("nicknameGeodetic").value == parts[0]) {
                recordsGeodetic[index] = nicknameGeodetic.value + ' ' + fixedLatText.value + ' ' + fixedLongText.value + ' ' + fixedAltitude.value + ' ' + antennaHeight_m.value + ' ' + antennaPhaseCenter_mm.value;
                break;
            }
        }
        if (index == recordsGeodetic.length)
            recordsGeodetic.push(nicknameGeodetic.value + ' ' + fixedLatText.value + ' ' + fixedLongText.value + ' ' + fixedAltitude.value + ' ' + antennaHeight_m.value + ' ' + antennaPhaseCenter_mm.value);
    }

    updateGeodeticList();
}

function deleteGeodetic() {
    var val = ge("StationCoordinatesGeodetic").value;
    if (val > "") {
        var parts = recordsGeodetic[val].split(' ');
        var nickName = parts[0];

        if (confirm("Delete location " + nickName + "?") == true) {
            recordsGeodetic.splice(val, 1);
        }
    }
    updateGeodeticList();
}

function adjustHAE() {

    var haeMethod = document.querySelector('input[name=markRadio]:checked').value;
    var hae;
    if (haeMethod == 1) {
        ge("fixedHAEAPC").disabled = false;
        ge("fixedAltitude").disabled = true;
        hae = Number(ge("fixedHAEAPC").value) - (Number(ge("antennaHeight_m").value) + Number(ge("antennaPhaseCenter_mm").value) / 1000);
        ge("fixedAltitude").value = hae.toFixed(3);
    }
    else {
        ge("fixedHAEAPC").disabled = true;
        ge("fixedAltitude").disabled = false;
        hae = Number(ge("fixedAltitude").value) + (Number(ge("antennaHeight_m").value) + Number(ge("antennaPhaseCenter_mm").value) / 1000);
        ge("fixedHAEAPC").value = hae.toFixed(3);
    }
}

function loadGeodetic() {
    var val = ge("StationCoordinatesGeodetic").value;
    if (val > "") {
        var parts = recordsGeodetic[val].split(' ');
        var numParts = parts.length;
        if (numParts >= 6) {
            var latParts = (numParts - 4) / 2;
            ge("nicknameGeodetic").value = parts[0];
            ge("fixedLatText").value = parts[1];
            if (latParts > 1) {
                for (let moreParts = 1; moreParts < latParts; moreParts++) {
                    ge("fixedLatText").value += ' ' + parts[moreParts + 1];
                }
            }
            ge("fixedLongText").value = parts[1 + latParts];
            if (latParts > 1) {
                for (let moreParts = 1; moreParts < latParts; moreParts++) {
                    ge("fixedLongText").value += ' ' + parts[moreParts + 1 + latParts];
                }
            }
            ge("fixedAltitude").value = parts[numParts - 3];
            ge("antennaHeight_m").value = parts[numParts - 2];
            ge("antennaPhaseCenter_mm").value = parts[numParts - 1];

            $("input[name=markRadio][value=1]").prop('checked', false);
            $("input[name=markRadio][value=2]").prop('checked', true);

            adjustHAE();

            clearError("nicknameGeodetic");
            clearError("fixedLatText");
            clearError("fixedLongText");
            clearError("fixedAltitude");
            clearError("antennaHeight_m");
            clearError("antennaPhaseCenter_mm");
        }
        else {
            console.log("stationGeodetic split error");
        }
    }
}

//Based on recordsGeodetic array, update and monospace HTML list
function updateGeodeticList() {
    ge("StationCoordinatesGeodetic").length = 0;

    if (recordsGeodetic.length == 0) {
        hide("StationCoordinatesGeodetic");
        nicknameGeodeticText.innerHTML = "No coordinates stored";
    }
    else {
        show("StationCoordinatesGeodetic");
        nicknameGeodeticText.innerHTML = "Nickname: Lat/Long/Alt";
        if (recordsGeodetic.length < 5)
            ge("StationCoordinatesGeodetic").size = recordsGeodetic.length;
    }

    for (let index = 0; index < recordsGeodetic.length; ++index) {
        var option = document.createElement('option');
        option.text = recordsGeodetic[index];
        option.value = index;
        ge("StationCoordinatesGeodetic").add(option);
    }

    $("#StationCoordinatesGeodetic option").each(function () {
        var parts = $(this).text().split(' ');
        var nickname = parts[0].substring(0, 15);

        if (parts.length >= 7) {
            $(this).text(nickname + ': ' + parts[1] + ' ' + parts[2] + ' ' + parts[3]
                + ' ' + parts[4] + ' ' + parts[5] + ' ' + parts[6]
                + ' ' + parts[7]).text;
        }
        else {
            $(this).text(nickname + ': ' + parts[1] + ' ' + parts[2] + ' ' + parts[3]).text;
        }

    });
}

function removeBadChars(val) {
    val = val.split(' ').join('');
    val = val.split(',').join('');
    val = val.split('\\').join('');
    return (val);
}

function getFileList() {
    if (showingFileList == false) {
        showingFileList = true;

        //If the tab was just opened, create table from scratch
        ge("fileManagerTable").innerHTML = "<table><tr align='left'><th>Name</th><th>Size</th><td><input type='checkbox' id='fileSelectAll' class='form-check-input fileManagerCheck' onClick='fileManagerToggle()'></td></tr></tr></table>";
        fileTableText = "";

        xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "/listfiles", false);
        xmlhttp.send();

        parseIncoming(xmlhttp.responseText); //Process CSV data into HTML

        ge("fileManagerTable").innerHTML += fileTableText;
    }
    else {
        showingFileList = false;
    }
}

function getMessageList() {
    if (obtainedMessageList == false) {
        obtainedMessageList = true;

        ge("messageList").innerHTML = "";
        messageText = "";

        xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "/listMessages", false);
        xmlhttp.send();

        parseIncoming(xmlhttp.responseText); //Process CSV data into HTML

        ge("messageList").innerHTML += messageText;
    }
}

function getMessageListBase() {
    if (obtainedMessageListBase == false) {
        obtainedMessageListBase = true;

        ge("messageListBase").innerHTML = "";
        messageText = "";

        xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "/listMessagesBase", false);
        xmlhttp.send();

        parseIncoming(xmlhttp.responseText); //Process CSV data into HTML

        ge("messageListBase").innerHTML += messageText;
    }
}

function fileManagerDownload() {
    selectedFiles = document.querySelectorAll('input[name=fileID]:checked');
    numberOfFilesSelected = document.querySelectorAll('input[name=fileID]:checked').length;
    fileNumber = 0;
    sendFile(); //Start first send
}

function sendFile() {
    if (fileNumber == numberOfFilesSelected) return;
    var urltocall = "/file?name=" + selectedFiles[fileNumber].id + "&action=download";
    console.log(urltocall);
    window.location.href = urltocall;

    fileNumber++;
}

function fileManagerToggle() {
    var checkboxes = document.querySelectorAll('input[name=fileID]');
    for (var i = 0, n = checkboxes.length; i < n; i++) {
        checkboxes[i].checked = ge("fileSelectAll").checked;
    }
}

function fileManagerDelete() {
    selectedFiles = document.querySelectorAll('input[name=fileID]:checked');

    if (confirm("Delete " + selectedFiles.length + " files?") == false) {
        return;
    }

    for (let x = 0; x < selectedFiles.length; x++) {
        var urltocall = "/file?name=" + selectedFiles[x].id + "&action=delete";
        xmlhttp = new XMLHttpRequest();

        xmlhttp.open("GET", urltocall, false);
        xmlhttp.send();
    }

    //Refresh file list
    showingFileList = false;
    getFileList();
}

function uploadFile() {
    var file = ge("file1").files[0];
    var formdata = new FormData();
    formdata.append("file1", file);
    var ajax = new XMLHttpRequest();
    ajax.upload.addEventListener("progress", progressHandler, false);
    ajax.addEventListener("load", completeHandler, false);
    ajax.addEventListener("error", errorHandler, false);
    ajax.addEventListener("abort", abortHandler, false);
    ajax.open("POST", "/uploadFile");
    ajax.send(formdata);
}
function progressHandler(event) {
    var percent = (event.loaded / event.total) * 100;
    ge("progressBar").value = Math.round(percent);
    ge("uploadStatus").innerHTML = Math.round(percent) + "% uploaded...";
    if (percent >= 100) {
        ge("uploadStatus").innerHTML = "Please wait, writing file to filesystem";
    }
}
function completeHandler(event) {
    ge("uploadStatus").innerHTML = "Upload Complete";
    ge("progressBar").value = 0;

    //Refresh file list
    showingFileList = false;
    getFileList();

    document.getElementById("uploadStatus").innerHTML = "Upload Complete";
}
function errorHandler(event) {
    ge("uploadStatus").innerHTML = "Upload Failed";
}
function abortHandler(event) {
    ge("uploadStatus").innerHTML = "Upload Aborted";
}

function tcpClientBoxes() {
    if (ge("enableTcpClient").checked == true) {
        show("tcpClientConfig");
    }
    else {
        hide("tcpClientConfig");
        ge("tcpClientPort").value = 2948;
    }
}

function tcpServerBoxes() {
    if (ge("enableTcpServer").checked == true) {
        show("tcpServerConfig");
    }
    else {
        hide("tcpServerConfig");
        ge("tcpServerPort").value = 2948;
    }
}

function udpBoxes() {
    if (ge("enableUdpServer").checked == true) {
        show("udpSettingsConfig");
    }
    else {
        hide("udpSettingsConfig");
        ge("udpServerPort").value = 10110;
    }
}

function dhcpEthernet() {
    if (ge("ethernetDHCP").checked == true) {
        hide("fixedIPSettingsConfigEthernet");
    }
    else {
        show("fixedIPSettingsConfigEthernet");
    }
}

function networkCount() {
    var count = 0;

    var wifiNetworks = document.querySelectorAll('input[id^=wifiNetwork]' && 'input[id$=SSID]');
    for (let x = 0; x < wifiNetworks.length; x++) {
        if (wifiNetworks[x].value.length > 0)
            count++;
    }

    return (count);
}

function checkNewFirmware() {
    if ((platformPrefix != "EVK") && (networkCount() == 0)) {
        showMsgError('firmwareCheckNewMsg', "WiFi list is empty");
        return;
    }

    ge("btnCheckNewFirmware").disabled = true;
    showMsg('firmwareCheckNewMsg', "Connecting to network", false);

    var settingCSV = "";

    //Send current WiFi SSID and PWs
    var clsElements = document.querySelectorAll('input[id^=wifiNetwork]');
    for (let x = 0; x < clsElements.length; x++) {
        settingCSV += clsElements[x].id + "," + clsElements[x].value + ",";
    }

    if (ge("enableRCFirmware").checked == true)
        settingCSV += "enableRCFirmware,true,";
    else
        settingCSV += "enableRCFirmware,false,";

    settingCSV += "checkNewFirmware,1,";

    console.log("Firmware sending: " + settingCSV);
    websocket.send(settingCSV);

    checkNewFirmwareTimeout = setTimeout(checkNewFirmware, 2000);
}

function checkingNewFirmware() {
    clearTimeout(checkNewFirmwareTimeout);
    console.log("Clearing timeout for checkNewFirmwareTimeout");

    showMsg('firmwareCheckNewMsg', "Checking firmware version");
}

function newFirmwareVersion(firmwareVersion) {
    clearMsg('firmwareCheckNewMsg');
    if (firmwareVersion == "ERROR") {
        showMsgError('firmwareCheckNewMsg', "Network or Server not available");
        hide("divGetNewFirmware");
        ge("btnCheckNewFirmware").disabled = false;
        return;
    }
    else if (firmwareVersion == "CURRENT") {
        showMsg('firmwareCheckNewMsg', "Firmware is up to date");
        hide("divGetNewFirmware");
        ge("btnCheckNewFirmware").disabled = false;
        return;
    }

    ge("btnGetNewFirmware").innerHTML = "Update to v" + firmwareVersion;
    ge("btnGetNewFirmware").disabled = false;
    ge("firmwareUpdateProgressBar").value = 0;
    clearMsg('firmwareUpdateProgressMsg');
    show("divGetNewFirmware");
}

function getNewFirmware() {

    if ((platformPrefix != "EVK") && (networkCount() == 0)) {
        showMsgError('firmwareCheckNewMsg', "WiFi list is empty");
        hide("divGetNewFirmware");
        ge("btnCheckNewFirmware").disabled = false;
        return;
    }

    ge("btnGetNewFirmware").disabled = true;
    clearMsg('firmwareCheckNewMsg');
    showMsg('firmwareUpdateProgressMsg', "Getting new firmware");

    var settingCSV = "";

    //Send current WiFi SSID and PWs
    var clsElements = document.querySelectorAll('input[id^=wifiNetwork]');
    for (let x = 0; x < clsElements.length; x++) {
        settingCSV += clsElements[x].id + "," + clsElements[x].value + ",";
    }
    settingCSV += "getNewFirmware,1,";

    console.log("Firmware sending: " + settingCSV);
    websocket.send(settingCSV);

    getNewFirmwareTimeout = setTimeout(getNewFirmware, 2000);
}

function gettingNewFirmware(val) {
    if (val == "1") {
        clearTimeout(getNewFirmwareTimeout);
    }
    else if (val == "ERROR") {
        hide("divGetNewFirmware");
        ge("btnCheckNewFirmware").disabled = false;
        showMsg('firmwareCheckNewMsg', "Error getting new firmware", true);
    }
}

function otaFirmwareStatus(percentComplete) {
    clearTimeout(getNewFirmwareTimeout);

    showMsg('firmwareUpdateProgressMsg', percentComplete + "% Complete");
    ge("firmwareUpdateProgressBar").value = percentComplete;

    if (percentComplete == 100) {
        resetComplete();
    }
}

//Given a user's string, try to identify the type and return the coordinate in DD.ddddddddd format
function identifyInputType(userEntry) {
    var coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN;
    var dashCount = 0;
    var spaceCount = 0;
    var decimalCount = 0;
    var lengthOfLeadingNumber = 0;
    convertedCoordinate = 0.0; //Clear what is given to us

    //Scan entry for invalid chars
    //A valid entry has only numbers, -, ' ', and .
    for (var x = 0; x < userEntry.length; x++) {

        if (isdigit(userEntry[x]) == true) {
            if (decimalCount == 0) lengthOfLeadingNumber++
        }
        else if (userEntry[x] == '-') dashCount++; //All good
        else if (userEntry[x] == ' ') spaceCount++; //All good
        else if (userEntry[x] == '.') decimalCount++; //All good
        else return (CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN); //String contains invalid character
    }

    // Seven possible entry types
    // DD.dddddd
    // DDMM.mmmmmmm
    // DD MM.mmmmmmm
    // DD-MM.mmmmmmm
    // DDMMSS.ssssss
    // DD MM SS.ssssss
    // DD-MM-SS.ssssss

    if (decimalCount > 1) return (CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN); //Just no. 40.09033470 is valid.
    if (spaceCount > 2) return (CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN); //Only 0, 1, or 2 allowed. 40 05 25.2049 is valid.
    if (dashCount > 3) return (CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN); //Only 0, 1, 2, or 3 allowed. -105-11-05.1629 is valid.
    if (lengthOfLeadingNumber > 7) return (CoordinateTypes.COORDINATE_INPUT_TYPE_INVALID_UNKNOWN); //Only 7 or fewer. -1051105.188992 (DDDMMSS or DDMMSS) is valid

    var negativeSign = false;
    if (userEntry[0] == '-') {
        userEntry = setCharAt(userEntry, 0, ''); //Remove leading space
        negativeSign = true;
        dashCount--; //Use dashCount as the internal dashes only, not the leading negative sign
    }

    if ((spaceCount == 0) && (dashCount == 0) && ((lengthOfLeadingNumber == 7) || (lengthOfLeadingNumber == 6))) //DDMMSS.ssssss
    {
        coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS;

        var intPortion = Math.trunc(Number(userEntry)); //Get DDDMMSS
        var decimal = Math.trunc(intPortion / 10000); //Get DDD
        intPortion -= (decimal * 10000);
        var minutes = Math.trunc(intPortion / 100); //Get MM

        //Find '.'
        if (userEntry.indexOf('.') == -1)
            coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS_NO_DECIMAL;

        var seconds = userEntry; //Get DDDMMSS.ssssss
        seconds -= (decimal * 10000); //Remove DDD
        seconds -= (minutes * 100); //Remove MM
        convertedCoordinate = decimal + (minutes / 60.0) + (seconds / 3600.0);
        if (negativeSign == true) {
            convertedCoordinate *= -1.0;
        }
    }
    else if (spaceCount == 0 && dashCount == 0 && (lengthOfLeadingNumber == 5 || lengthOfLeadingNumber == 4)) //DDMM.mmmmmmm
    {
        coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DDMM;

        var intPortion = Math.trunc(userEntry); //Get DDDMM
        var decimal = intPortion / 100; //Get DDD
        intPortion -= (decimal * 100);
        var minutes = userEntry; //Get DDDMM.mmmmmmm
        minutes -= (decimal * 100); //Remove DDD
        convertedCoordinate = decimal + (minutes / 60.0);
        if (negativeSign == true) {
            convertedCoordinate *= -1.0;
        }
    }

    else if (dashCount == 1) //DD-MM.mmmmmmm
    {
        coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_DASH;

        var data = userEntry.split('-');
        var decimal = Number(data[0]); //Get DD
        var minutes = Number(data[1]); //Get MM.mmmmmmm
        convertedCoordinate = decimal + (minutes / 60.0);
        if (negativeSign == true) {
            convertedCoordinate *= -1.0;
        }
    }
    else if (dashCount == 2) //DD-MM-SS.ssss
    {
        coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH;

        var data = userEntry.split('-');
        var decimal = Number(data[0]); //Get DD
        var minutes = Number(data[1]); //Get MM

        //Find '.'
        if (userEntry.indexOf('.') == -1)
            coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH_NO_DECIMAL;

        var seconds = Number(data[2]); //Get SS.ssssss
        convertedCoordinate = decimal + (minutes / 60.0) + (seconds / 3600.0);
        if (negativeSign == true) {
            convertedCoordinate *= -1.0;
        }
    }
    else if (spaceCount == 0) //DD.ddddddddd
    {
        coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD;
        convertedCoordinate = userEntry;
        if (negativeSign == true) {
            convertedCoordinate *= -1.0;
        }
    }
    else if (spaceCount == 1) //DD MM.mmmmmmm
    {
        coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM;

        var data = userEntry.split(' ');
        var decimal = Number(data[0]); //Get DD
        var minutes = Number(data[1]); //Get MM.mmmmmmm
        convertedCoordinate = decimal + (minutes / 60.0);
        if (negativeSign == true) {
            convertedCoordinate *= -1.0;
        }
    }
    else if (spaceCount == 2) //DD MM SS.ssssss
    {
        coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS;

        var data = userEntry.split(' ');
        var decimal = Number(data[0]); //Get DD
        var minutes = Number(data[1]); //Get MM

        //Find '.'
        if (userEntry.indexOf('.') == -1)
            coordinateInputType = CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_NO_DECIMAL;

        var seconds = Number(data[2]); //Get SS.ssssss
        convertedCoordinate = decimal + (minutes / 60.0) + (seconds / 3600.0);
        if (negativeSign == true) {
            convertedCoordinate *= -1.0;
        }
    }

    //console.log("convertedCoordinate: " + convertedCoordinate.toFixed(9));
    return (coordinateInputType);
}

//Given a coordinate and input type, output a string
//So DD.ddddddddd can become 'DD MM SS.ssssss', etc
function convertInput(coordinate, coordinateInputType) {
    var coordinateString = "";

    if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD) {
        coordinate = Number(coordinate).toFixed(9);
        return (coordinate);
    }
    else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM
        || coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DDMM
        || coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_DASH
        || coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SYMBOL
    ) {
        var longitudeDegrees = Math.trunc(coordinate);
        coordinate -= longitudeDegrees;
        coordinate *= 60;
        if (coordinate < 1)
            coordinate *= -1;

        coordinate = coordinate.toFixed(7);

        if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DDMM)
            coordinateString = longitudeDegrees + "" + coordinate;
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_DASH)
            coordinateString = longitudeDegrees + "-" + coordinate;
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SYMBOL)
            coordinateString = longitudeDegrees + "°" + coordinate + "'";
        else
            coordinateString = longitudeDegrees + " " + coordinate;
    }
    else if ((coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS)
        || (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS)
        || (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH)
        || (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_SYMBOL)
        || (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS_NO_DECIMAL)
        || (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_NO_DECIMAL)
        || (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH_NO_DECIMAL)) {
        var longitudeDegrees = Math.trunc(coordinate);
        coordinate -= longitudeDegrees;
        coordinate *= 60;
        if (coordinate < 1)
            coordinate *= -1;

        var longitudeMinutes = Math.trunc(coordinate);
        coordinate -= longitudeMinutes;
        coordinate *= 60;

        coordinate = coordinate.toFixed(6);

        if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS)
            coordinateString = longitudeDegrees + "" + longitudeMinutes + "" + coordinate;
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH)
            coordinateString = longitudeDegrees + "-" + longitudeMinutes + "-" + coordinate;
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_SYMBOL)
            coordinateString = longitudeDegrees + "°" + longitudeMinutes + "'" + coordinate + "\"";
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS)
            coordinateString = longitudeDegrees + " " + longitudeMinutes + " " + coordinate;
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS_NO_DECIMAL)
            coordinateString = longitudeDegrees + "" + longitudeMinutes + "" + Math.round(coordinate);
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_NO_DECIMAL)
            coordinateString = longitudeDegrees + " " + longitudeMinutes + " " + Math.round(coordinate);
        else if (coordinateInputType == CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH_NO_DECIMAL)
            coordinateString = longitudeDegrees + "-" + longitudeMinutes + "-" + Math.round(coordinate);
    }

    return (coordinateString);
}

function isdigit(c) { return /\d/.test(c); }

function setCharAt(str, index, chr) {
    if (index > str.length - 1) return str;
    return str.substring(0, index) + chr + str.substring(index + 1);
}

//Given an input type, return a printable string
function printableInputType(coordinateInputType) {
    switch (coordinateInputType) {
        default:
            return ("Unknown");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DD):
            return ("DD.ddddddddd");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DDMM):
            return ("DDMM.mmmmmmm");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM):
            return ("DD MM.mmmmmmm");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_DASH):
            return ("DD-MM.mmmmmmm");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS):
            return ("DDMMSS.ssssss");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS):
            return ("DD MM SS.ssssss");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH):
            return ("DD-MM-SS.ssssss");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DDMMSS_NO_DECIMAL):
            return ("DDMMSS");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_NO_DECIMAL):
            return ("DD MM SS");
            break;
        case (CoordinateTypes.COORDINATE_INPUT_TYPE_DD_MM_SS_DASH_NO_DECIMAL):
            return ("DD-MM-SS");
            break;
    }
    return ("Unknown");
}