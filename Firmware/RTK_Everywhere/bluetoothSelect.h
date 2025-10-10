#ifdef COMPILE_BT

// We use a local copy of the BluetoothSerial library so that we can increase the RX buffer. See issues:
// https://github.com/sparkfun/SparkFun_RTK_Firmware/issues/23
// https://github.com/sparkfun/SparkFun_RTK_Firmware/issues/469
#include "src/BluetoothSerial/BluetoothSerial.h"

#include <BleSerial.h> //Click here to get the library: http://librarymanager/All#ESP32_BleSerial by Avinab Malla

#include "esp_sdp_api.h"

class BTSerialInterface : public virtual Stream
{
  public:
    virtual bool begin(String deviceName, bool isMaster, bool disableBLE, uint16_t rxQueueSize, uint16_t txQueueSize,
                       const char *serviceID, const char *rxID, const char *txID) = 0;

    virtual void disconnect() = 0;
    virtual void end() = 0;
    virtual esp_err_t register_callback(void * callback) = 0;
    virtual void setTimeout(unsigned long timeout) = 0;

    virtual int available() = 0;
    virtual size_t readBytes(uint8_t *buffer, size_t bufferSize) = 0;
    virtual int read() = 0;
    virtual int peek() = 0;

    // virtual bool isCongested() = 0;
    virtual size_t write(const uint8_t *buffer, size_t size) = 0;
    virtual size_t write(uint8_t value) = 0;
    virtual void flush() = 0;
    virtual bool connect(uint8_t remoteAddress[], int channel,
                         esp_spp_sec_t sec_mask = (ESP_SPP_SEC_ENCRYPT | ESP_SPP_SEC_AUTHENTICATE),
                         esp_spp_role_t role = ESP_SPP_ROLE_MASTER) = 0; // Needed for Apple Accessory
    virtual bool connected() = 0;
    virtual void enableSSP(bool inputCapability, bool outputCapability) = 0;
    virtual bool aclConnected() = 0;
    virtual uint8_t *aclGetAddress() = 0;
    virtual std::map<int, std::string> getChannels(const BTAddress &remoteAddress) = 0;

    virtual void onConfirmRequest(void (*cbPtr)(uint32_t)) = 0;
    virtual void confirmReply(bool confirm) = 0;
    virtual void respondPasskey(uint32_t passkey) = 0;

    virtual void deleteAllBondedDevices() = 0;
    virtual void memrelease() = 0;
};

class BTClassicSerial : public virtual BTSerialInterface, public BluetoothSerial
{
    // Everything is already implemented in BluetoothSerial since the code was
    // originally written using that class
  public:
    bool begin(String deviceName, bool isMaster, bool disableBLE, uint16_t rxQueueSize, uint16_t txQueueSize,
               const char *serviceID, const char *rxID, const char *txID)
    {
        return BluetoothSerial::begin(deviceName, isMaster, disableBLE, rxQueueSize, txQueueSize);
    }

    void disconnect()
    {
        BluetoothSerial::disconnect();
    }

    void end()
    {
        BluetoothSerial::end();
    }

    esp_err_t register_callback(void * callback)
    {
        return BluetoothSerial::register_callback((esp_spp_cb_t)callback);
    }

    void setTimeout(unsigned long timeout)
    {
        BluetoothSerial::setTimeout(timeout);
    }

    int available()
    {
        return BluetoothSerial::available();
    }

    size_t readBytes(uint8_t *buffer, size_t bufferSize)
    {
        return BluetoothSerial::readBytes(buffer, bufferSize);
    }

    int read()
    {
        return BluetoothSerial::read();
    }

    int peek()
    {
        return BluetoothSerial::peek();
    }

    size_t write(const uint8_t *buffer, size_t size)
    {
        return BluetoothSerial::write(buffer, size);
    }

    size_t write(uint8_t value)
    {
        return BluetoothSerial::write(value);
    }

    void flush()
    {
        BluetoothSerial::flush();
    }

    bool connect(uint8_t remoteAddress[], int channel,
                 esp_spp_sec_t sec_mask = (ESP_SPP_SEC_ENCRYPT | ESP_SPP_SEC_AUTHENTICATE),
                 esp_spp_role_t role = ESP_SPP_ROLE_MASTER)
    {
        return (BluetoothSerial::connect(remoteAddress, channel, sec_mask, role));
    }

    bool connected()
    {
        return (BluetoothSerial::connected());
    }

    void enableSSP(bool inputCapability, bool outputCapability)
    {
        BluetoothSerial::enableSSP(inputCapability, outputCapability);
    }

    bool aclConnected()
    {
        return (BluetoothSerial::aclConnected());
    }

    uint8_t *aclGetAddress()
    {
        return (BluetoothSerial::aclGetAddress());
    }

    std::map<int, std::string> getChannels(const BTAddress &remoteAddress)
    {
        return (BluetoothSerial::getChannels(remoteAddress));
    }

    void onConfirmRequest(void (*cbPtr)(uint32_t))
    {
        BluetoothSerial::onConfirmRequest(cbPtr);
    }

    void confirmReply(bool confirm)
    {
        BluetoothSerial::confirmReply((boolean)confirm);
    }

    void respondPasskey(uint32_t passkey)
    {
        BluetoothSerial::respondPasskey(passkey);
    }

    void deleteAllBondedDevices()
    {
        BluetoothSerial::deleteAllBondedDevices();
    }

    void memrelease()
    {
        BluetoothSerial::memrelease();
    }
};

class BTLESerial : public virtual BTSerialInterface, public BleSerial
{
  public:
    // Missing from BleSerial
    bool begin(String deviceName, bool isMaster, bool disableBLE, uint16_t rxQueueSize, uint16_t txQueueSize,
               const char *serviceID, const char *rxID, const char *txID)
    {
        BleSerial::begin(deviceName.c_str(), serviceID, rxID, txID, -1); // name, service_uuid, rx_uuid, tx_uuid, led_pin
        return true;
    }

    void disconnect()
    {
        // Server->disconnect(Server->getConnId());
        // No longer used in v2 of BleSerial
    }

    void end()
    {
        BleSerial::end();
    }

    esp_err_t register_callback(void * callback)
    {
        return ESP_OK;
    }

    void setTimeout(unsigned long timeout)
    {
        BleSerial::setTimeout(timeout);
    }

    int available()
    {
        return BleSerial::available();
    }

    size_t readBytes(uint8_t *buffer, size_t bufferSize)
    {
        return BleSerial::readBytes(buffer, bufferSize);
    }

    int read()
    {
        return BleSerial::read();
    }

    int peek()
    {
        return BleSerial::peek();
    }

    size_t write(const uint8_t *buffer, size_t size)
    {
        return BleSerial::write(buffer, size);
    }

    size_t write(uint8_t value)
    {
        return BleSerial::write(value);
    }

    void flush()
    {
        BleSerial::flush();
    }

    bool connect(uint8_t remoteAddress[], int channel, esp_spp_sec_t sec_mask, esp_spp_role_t role)
    {
        return false;
    }

    bool connected()
    {
        return (BleSerial::connected());
    }

    void enableSSP(bool inputCapability, bool outputCapability) {}

    bool aclConnected()
    {
        return false;
    }

    uint8_t *aclGetAddress()
    {
        return nullptr;
    }

    std::map<int, std::string> getChannels(const BTAddress &remoteAddress)
    {
        std::map<int, std::string> empty;
        return empty;
    }

    void onConfirmRequest(void (*cbPtr)(uint32_t)) {}

    void confirmReply(bool confirm) {}

    void respondPasskey(uint32_t passkey) {}

    void deleteAllBondedDevices() {}

    void memrelease() {}

    // Callbacks removed in v2 of BleSerial. Using polled connected() in bluetoothUpdate()
    // override BLEServerCallbacks
    // void Server->onConnect(BLEServer *pServer)
    // {
    //     connectionCallback(ESP_SPP_SRV_OPEN_EVT, nullptr); // Trigger callback to bluetoothCallback()
    // }

    // void onDisconnect(BLEServer *pServer)
    // {
    //     connectionCallback(ESP_SPP_CLOSE_EVT, nullptr); // Trigger callback to bluetoothCallback()
    //     // Server->startAdvertising(); //No longer used in v2 of BleSerial
    // }

  private:
    esp_spp_cb_t connectionCallback;
};

#endif // COMPILE_BT
