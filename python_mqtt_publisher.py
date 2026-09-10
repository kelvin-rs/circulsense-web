"""
=============================================================================
CIRCULSENSE AI - PYTHON MQTT & REST TELEMETRY SENDER
=============================================================================
Skrip ini mensimulasikan atau menghubungkan Node Sensor IoT (ESP32 / Raspberry Pi)
dengan Broker MQTT EMQX dan Web API CirculSense.

Kebutuhan Library:
pip install paho-mqtt requests
=============================================================================
"""

import time
import json
import random
import requests
import paho.mqtt.client as mqtt

# Konfigurasi MQTT EMQX Broker
MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "circulsense/esp32/gas"

# Konfigurasi REST API Fallback
REST_API_URL = "http://localhost:3000/api/iot/telemetri"

def generate_telemetry_payload():
    """Membuat data pembacaan sensor MQ-4, MQ-135, DHT22, TCS34725"""
    ch4 = round(random.uniform(0.2, 2.8), 2)
    aqi = round(random.uniform(15.0, 110.0), 1)
    suhu = round(random.uniform(24.0, 31.0), 1)
    kelembapan = round(random.uniform(55.0, 85.0), 1)
    
    r = random.randint(30, 220)
    g = random.randint(120, 240)
    b = random.randint(30, 180)
    color_hex = f"#{r:02x}{g:02x}{b:02x}"

    return {
        # MQ-4 Metana
        "ch4_ppm": ch4,
        "raw_mq4": int(ch4 * 350),
        
        # MQ-135 Gas Organik
        "aqi_ppm": aqi,
        "raw_mq135": int(aqi * 12),
        
        # DHT22
        "temperature": suhu,
        "humidity": kelembapan,
        
        # TCS34725 Warna
        "color_r": r,
        "color_g": g,
        "color_b": b,
        "color_c": r + g + b,
        "color_lux": round(random.uniform(80.0, 350.0), 1),
        "color_hex": color_hex,
        "color_name": "Hijau Segar" if g > r else "Kuning Kemerahan",
        
        # Info Node
        "battery": random.randint(85, 100),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

def publish_mqtt_loop():
    client = mqtt.Client(client_id=f"circulsense_node_{random.randint(1000, 9999)}")
    
    print(f"Menghubungkan ke Broker MQTT: {MQTT_BROKER}:{MQTT_PORT}...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    print(f"Mulai mempublikasikan data sensor ke topik: {MQTT_TOPIC}")
    print("Tekan Ctrl+C untuk menghentikan.\n")

    try:
        while True:
            payload = generate_telemetry_payload()
            json_str = json.dumps(payload)
            
            # 1. Kirim via MQTT
            client.publish(MQTT_TOPIC, json_str)
            print(f"[MQTT Pub] Topik: {MQTT_TOPIC} | CH4: {payload['ch4_ppm']} ppm | AQI: {payload['aqi_ppm']} ppm | Suhu: {payload['temperature']}°C")

            # 2. Opsional: Kirim juga via REST API
            try:
                requests.post(REST_API_URL, json=payload, timeout=2)
            except Exception:
                pass

            time.sleep(3) # Kirim setiap 3 detik
    except KeyboardInterrupt:
        print("\nMenghentikan pengiriman...")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    publish_mqtt_loop()
