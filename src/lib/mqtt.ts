import mqtt, { MqttClient } from 'mqtt';
import { GasData } from '@/types/circulsense';

export type MQTTStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

class MQTTService {
  private client: MqttClient | null = null;
  private listeners: ((data: GasData) => void)[] = [];
  private statusListeners: ((status: MQTTStatus) => void)[] = [];
  private status: MQTTStatus = 'disconnected';

  // Live sensor readings received directly from ESP32
  private currentGasData: GasData = {
    ch4_ppm: null,
    aqi_ppm: null,
    raw_mq4: null,
    raw_mq135: null,
    temperature: null,
    humidity: null,
    color_r: null,
    color_g: null,
    color_b: null,
    color_c: null,
    color_lux: null,
    color_temp: null,
    color_hex: null,
    color_name: null,
    battery: 100,
    is_connected: false,
    has_data: false,
    timestamp: new Date().toISOString()
  };

  private brokerUrl: string = 'wss://broker.emqx.io:8084/mqtt';
  private topic: string = 'circulsense/esp32/gas';

  constructor() {
    //
  }

  public init(brokerUrl?: string, topic?: string) {
    if (typeof window === 'undefined') return;

    if (brokerUrl) this.brokerUrl = brokerUrl;
    if (topic) this.topic = topic;

    this.connect();
  }

  public connect(brokerUrl?: string, topic?: string) {
    if (typeof window === 'undefined') return;

    if (brokerUrl) this.brokerUrl = brokerUrl;
    if (topic) this.topic = topic;

    if (this.client) {
      try {
        this.client.end(true);
      } catch (e) {
        console.warn('Error closing previous mqtt client:', e);
      }
    }

    this.updateStatus('connecting');

    try {
      this.client = mqtt.connect(this.brokerUrl, {
        keepalive: 60,
        reconnectPeriod: 3000,
        connectTimeout: 8000,
        clean: true,
        clientId: 'circulsense_web_' + Math.random().toString(16).substring(2, 8)
      });

      this.client.on('connect', () => {
        console.log('[MQTT] Connected to real EMQX broker at', this.brokerUrl);
        this.updateStatus('connected');
        this.client?.subscribe([this.topic, 'circulsense/esp32/sensor', 'circulsense/esp32/telemetry'], (err) => {
          if (err) {
            console.error('[MQTT] Subscription error:', err);
          } else {
            console.log('[MQTT] Subscribed to sensor topics');
          }
        });
      });

      this.client.on('message', (receivedTopic, payload) => {
        if (
          receivedTopic === this.topic ||
          receivedTopic === 'circulsense/esp32/sensor' ||
          receivedTopic === 'circulsense/esp32/telemetry'
        ) {
          try {
            const data = JSON.parse(payload.toString());

            const r = Number(data.r ?? data.color_r ?? data.red ?? this.currentGasData.color_r ?? 220);
            const g = Number(data.g ?? data.color_g ?? data.green ?? this.currentGasData.color_g ?? 60);
            const b = Number(data.b ?? data.color_b ?? data.blue ?? this.currentGasData.color_b ?? 50);
            const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
            const hex = data.hex || data.color_hex || `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`.toUpperCase();

            // Infer color name from RGB ratio
            let colorName = data.color_name;
            if (!colorName) {
              if (r > 160 && g < 120 && b < 100) colorName = 'Merah Likopen (Matang)';
              else if (g > 140 && r < 130) colorName = 'Hijau Klorofil (Segar)';
              else if (r > 160 && g > 150 && b < 100) colorName = 'Kuning Karotenoid';
              else if (r > 140 && g > 80 && b < 60) colorName = 'Oranye / Jingga';
              else if (r < 100 && g < 90 && b < 90) colorName = 'Cokelat Gelap / Busuk';
              else colorName = 'Spektrum Warna Alami';
            }

            this.currentGasData = {
              ch4_ppm: Number(data.ch4_ppm ?? data.ch4 ?? 0.0),
              aqi_ppm: Number(data.aqi_ppm ?? data.aqi ?? 0),
              raw_mq4: Number(data.raw_mq4 ?? 0),
              raw_mq135: Number(data.raw_mq135 ?? 0),
              // DHT22 Telemetry (Hanya gunakan nilai real jika dikirim oleh ESP32)
              temperature: (data.temp != null && !isNaN(Number(data.temp))) 
                ? Number(data.temp) 
                : ((data.temperature != null && !isNaN(Number(data.temperature))) 
                    ? Number(data.temperature) 
                    : ((data.dht_temp != null && !isNaN(Number(data.dht_temp))) ? Number(data.dht_temp) : (this.currentGasData.temperature ?? null))),
              humidity: (data.hum != null && !isNaN(Number(data.hum))) 
                ? Number(data.hum) 
                : ((data.humidity != null && !isNaN(Number(data.humidity))) 
                    ? Number(data.humidity) 
                    : ((data.dht_hum != null && !isNaN(Number(data.dht_hum))) ? Number(data.dht_hum) : (this.currentGasData.humidity ?? null))),
              // TCS34725 Telemetry
              color_r: clamp(r),
              color_g: clamp(g),
              color_b: clamp(b),
              color_c: Number(data.c ?? data.color_c ?? data.clear ?? 0),
              color_lux: Number(data.lux ?? data.color_lux ?? 0),
              color_temp: Number(data.cct ?? data.color_temp ?? data.temp_k ?? 0),
              color_hex: hex,
              color_name: colorName,
              battery: Number(data.battery ?? 100),
              is_connected: true,
              has_data: true,
              timestamp: new Date().toISOString()
            };
            this.notifyListeners(this.currentGasData);
          } catch (e) {
            console.error('[MQTT] Error parsing ESP32 payload:', e);
          }
        }
      });

      this.client.on('error', (err) => {
        console.warn('[MQTT] Connection error:', err);
        this.updateStatus('error');
      });

      this.client.on('offline', () => {
        console.warn('[MQTT] Client offline');
        this.updateStatus('disconnected');
      });

      this.client.on('close', () => {
        this.updateStatus('disconnected');
      });

    } catch (err) {
      console.warn('[MQTT] Connect exception:', err);
      this.updateStatus('error');
    }
  }

  public getCurrentData(): GasData {
    return this.currentGasData;
  }

  public getStatus(): MQTTStatus {
    return this.status;
  }

  public getBrokerUrl(): string {
    return this.brokerUrl;
  }

  public getTopic(): string {
    return this.topic;
  }

  public subscribe(callback: (data: GasData) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentGasData);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public onStatusChange(callback: (status: MQTTStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(data: GasData) {
    this.listeners.forEach(cb => cb(data));
  }

  private updateStatus(newStatus: MQTTStatus) {
    this.status = newStatus;
    this.statusListeners.forEach(cb => cb(newStatus));
  }
}

export const mqttService = new MQTTService();
