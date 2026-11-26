#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"

// ================= CẤU HÌNH WOKWI WIFI =================
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// ================= CẤU HÌNH BACKEND (CHỈ ĐỔI DÒNG NÀY GIỮA LOCAL & RENDER) =================
// 1. Khi chạy LOCAL: mở tunnel bằng lệnh:
//    cloudflared tunnel --url http://localhost:8080
//    rồi dán URL https://xxxx.trycloudflare.com vào đây (KHÔNG có dấu / ở cuối).
// 2. Khi deploy RENDER: đổi thành https://<ten-backend-cua-ban>.onrender.com
const char* SERVER_BASE_URL = "http://asafp-171-247-169-5.run.pinggy-free.link";

// Khớp với biến môi trường IOT_INGEST_KEY trong Backend (mặc định dev: hona-iot-dev-key-2026)
const char* IOT_INGEST_KEY = "hona-iot-dev-key-2026";

// ================= CẤU HÌNH KHO & CẢM BIẾN =================
const int HUB_ID = 2;
const char* ZONE_CODE = "ZONE-A";
const char* DEVICE_ID = "WOKWI-ESP32-DHT22-01";

#define DHTPIN 15
#define DHTTYPE DHT22
#define ALERT_LED_PIN 2
#define BUZZER_PIN 4

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long lastReadMs = 0;
unsigned long lastSendMs = 0;
unsigned long lastBeepMs = 0;
const unsigned long READ_INTERVAL_MS = 250;
const unsigned long MIN_CHANGE_SEND_MS = 800;
const unsigned long HEARTBEAT_INTERVAL_MS = 4000;
float lastSentTemp = -999.0;
float lastSentHum = -999.0;
bool isAlertActive = false;

void updateLcdDisplay(float temp, float hum, bool alert, const char* statusText) {
  lcd.setCursor(0, 0);
  char line1[17];
  snprintf(line1, sizeof(line1), "%-7s T:%4.1fC ", ZONE_CODE, temp);
  lcd.print(line1);

  lcd.setCursor(0, 1);
  char line2[17];
  snprintf(line2, sizeof(line2), "H:%4.1f%% %-7s", hum, alert ? "CANHBAO" : statusText);
  lcd.print(line2);
}

void setup() {
  Serial.begin(115200);
  pinMode(ALERT_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(ALERT_LED_PIN, LOW);
  noTone(BUZZER_PIN);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("HONA FRESH KHO");
  lcd.setCursor(0, 1);
  lcd.print("Dang ket noi...");

  dht.begin();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS, 6); // Channel 6 giup Wokwi-GUEST ket noi tuc thi
  Serial.print("Dang ket noi WiFi Wokwi");
  int wifiTries = 0;
  while (WiFi.status() != WL_CONNECTED && wifiTries < 25) {
    delay(300);
    Serial.print(".");
    wifiTries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi da ket noi! IP: " + WiFi.localIP().toString());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(ZONE_CODE);
    delay(600);
  } else {
    Serial.println("\nCho WiFi cham, se thu lai trong loop...");
  }
}

void loop() {
  unsigned long now = millis();

  // Phát tiếng còi bíp ngắt quãng khi đang ở trạng thái báo động
  if (isAlertActive) {
    if (now - lastBeepMs >= 700) {
      lastBeepMs = now;
      tone(BUZZER_PIN, 2200, 250);
    }
  } else {
    noTone(BUZZER_PIN);
  }

  if (now - lastReadMs < READ_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastReadMs = now;

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Loi doc cam bien DHT22!");
    lcd.setCursor(0, 1);
    lcd.print("Loi cam bien!   ");
    return;
  }

  // Chỉ gửi khi thay đổi (cách lần trước >= 2s) hoặc đến chu kỳ 5s
  bool changed = (fabs(temperature - lastSentTemp) >= 0.2) || (fabs(humidity - lastSentHum) >= 1.0);
  bool canSendChange = changed && (now - lastSendMs >= MIN_CHANGE_SEND_MS);
  bool canSendHeartbeat = (now - lastSendMs >= HEARTBEAT_INTERVAL_MS);
  if (!canSendChange && !canSendHeartbeat) {
    updateLcdDisplay(temperature, humidity, isAlertActive, isAlertActive ? "CANHBAO" : "DAT    ");
    return;
  }
  lastSendMs = now;

  // Hiển thị ngay giá trị thực tế lên LCD
  updateLcdDisplay(temperature, humidity, isAlertActive, "DANGGUI");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Mat ket noi WiFi, dang thu ket noi lai...");
    WiFi.reconnect();
    updateLcdDisplay(temperature, humidity, isAlertActive, "NO-WIFI");
    return;
  }

  String endpoint = String(SERVER_BASE_URL) + "/api/v1/iot/warehouse-telemetry";
  String payload = "{";
  payload += "\"hubId\":" + String(HUB_ID) + ",";
  payload += "\"zoneCode\":\"" + String(ZONE_CODE) + "\",";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"source\":\"WOKWI\",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"humidity\":" + String(humidity, 1);
  payload += "}";

  Serial.println("Gui du lieu: " + payload);

  int httpCode = -1;
  String response = "";

  // Thu gui toi da 2 lan; tu dong chon HTTP hoac HTTPS theo SERVER_BASE_URL
  bool isHttps = String(SERVER_BASE_URL).startsWith("https://");
  for (int attempt = 0; attempt < 2; attempt++) {
    HTTPClient http;
    http.setConnectTimeout(15000);
    http.setTimeout(15000);
    http.setReuse(false);

    if (isHttps) {
      WiFiClientSecure* secureClient = new WiFiClientSecure();
      if (!secureClient) break;
      secureClient->setInsecure();
      secureClient->setHandshakeTimeout(20);
      if (http.begin(*secureClient, endpoint)) {
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Connection", "close");
        http.addHeader("X-IOT-KEY", IOT_INGEST_KEY);
        httpCode = http.POST(payload);
        response = httpCode > 0 ? http.getString() : http.errorToString(httpCode);
        http.end();
      }
      secureClient->stop();
      delete secureClient;
    } else {
      WiFiClient plainClient;
      if (http.begin(plainClient, endpoint)) {
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Connection", "close");
        http.addHeader("X-IOT-KEY", IOT_INGEST_KEY);
        httpCode = http.POST(payload);
        response = httpCode > 0 ? http.getString() : http.errorToString(httpCode);
        http.end();
      }
      plainClient.stop();
    }

    if (httpCode > 0) break;
    delay(600);
  }

  Serial.printf("HTTP %d -> %s\n", httpCode, response.c_str());

  if (httpCode == 200) {
    lastSentTemp = temperature;
    lastSentHum = humidity;
  }

  // Bat LED + Coi bao dong neu server tra ve "alert":true
  if (httpCode == 200 && response.indexOf("\"alert\":true") >= 0) {
    isAlertActive = true;
    digitalWrite(ALERT_LED_PIN, HIGH);
    updateLcdDisplay(temperature, humidity, true, "CANHBAO");
  } else if (httpCode == 200) {
    isAlertActive = false;
    digitalWrite(ALERT_LED_PIN, LOW);
    noTone(BUZZER_PIN);
    updateLcdDisplay(temperature, humidity, false, "DAT    ");
  } else {
    updateLcdDisplay(temperature, humidity, isAlertActive, "ERR-API");
  }
}
