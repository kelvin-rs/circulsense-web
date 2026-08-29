import mqtt, { MqttClient } from 'mqtt';
import { GasData } from '@/types/circulsense';

export type MQTTStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

class MQTTService {
  private client: MqttClient | null = null;
  private listeners: ((data: GasData) => void)[] = [];
  private statusListeners: ((status: MQTTStatus) => void)[] = [];
  private status: MQTTStatus = 'disconnected';

  // Live gas readings received directly from ESP32
  private currentGasData: GasData = {
    ch4_ppm: 0.0,
    aqi_ppm: 0,
    raw_mq4: 0,
    raw_mq135: 0,
    battery: 100,
    is_connected: false,
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
        this.client?.subscribe(this.topic, (err) => {
          if (err) {
            console.error('[MQTT] Subscription error:', err);
          } else {
            console.log('[MQTT] Subscribed to topic:', this.topic);
          }
        });
      });

      this.client.on('message', (receivedTopic, payload) => {
        if (receivedTopic === this.topic) {
          try {
            const data = JSON.parse(payload.toString());
            this.currentGasData = {
              ch4_ppm: Number(data.ch4_ppm ?? data.ch4 ?? 0.0),
              aqi_ppm: Number(data.aqi_ppm ?? data.aqi ?? 0),
              raw_mq4: Number(data.raw_mq4 ?? 0),
              raw_mq135: Number(data.raw_mq135 ?? 0),
              battery: Number(data.battery ?? 100),
              is_connected: true,
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
