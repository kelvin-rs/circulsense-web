"""
=============================================================================
CIRCULSENSE AI - PYTHON ML INFERENCE CLIENT (YOLO & SENSOR FUSION)
=============================================================================
Skrip ini mendemonstrasikan cara menghubungkan model YOLO (Ultralytics / PyTorch)
pada Python dengan sistem CirculSense Web API dan Supabase Database.

Kebutuhan Library:
pip install requests opencv-python ultralytics
=============================================================================
"""

import time
import requests
import json
import base64
import os

# Konfigurasi Endpoint CirculSense
API_BASE_URL = os.getenv("CIRCULSENSE_API_URL", "http://localhost:3000")
USER_ID = os.getenv("CIRCULSENSE_USER_ID", "") # Isi dengan UUID pengguna Anda dari Supabase

def encode_image_to_base64(image_path: str) -> str:
    """Mengonversi file gambar ke format data URL base64"""
    if not os.path.exists(image_path):
        return ""
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        return f"data:image/jpeg;base64,{encoded_string}"

def kirim_hasil_yolo(
    nama_bahan: str,
    kategori: str,
    skor_kepercayaan: float,
    skor_kualitas_visual: int,
    daftar_cacat: list,
    bounding_boxes: list,
    citra_path: str = "",
    waktu_inferensi_ms: float = 45.0,
    user_id: str = USER_ID
):
    """
    Mengirimkan hasil inferensi visual YOLO ke API CirculSense (/api/ml/yolo)
    """
    endpoint = f"{API_BASE_URL}/api/ml/yolo"
    
    citra_base64 = encode_image_to_base64(citra_path) if citra_path else ""
    
    payload = {
        "id_pengguna": user_id,
        "nama_model": "YOLOv8-Food-Freshness-Indonesia",
        "nama_bahan_terdeteksi": nama_bahan,
        "kategori_bahan": kategori,
        "skor_kepercayaan": round(skor_kepercayaan, 4),
        "skor_kualitas_visual": skor_kualitas_visual,
        "daftar_cacat_visual": daftar_cacat,
        "bounding_boxes": bounding_boxes,
        "citra_input_url": citra_base64,
        "waktu_inferensi_ms": waktu_inferensi_ms
    }

    try:
        response = requests.post(endpoint, json=payload, timeout=10)
        if response.status_code in [200, 201]:
            print(f"✓ [ML YOLO] Berhasil dikirim: {nama_bahan} (Confidence: {skor_kepercayaan:.2f})")
            return response.json()
        else:
            print(f"✗ [ML YOLO] Gagal: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"✗ [ML YOLO] Error koneksi: {str(e)}")
        return None

def kirim_inferensi_fusi_lengkap(
    nama_bahan: str,
    kategori: str,
    ch4_ppm: float,
    aqi_ppm: float,
    suhu: float,
    kelembapan: float,
    color_hex: str,
    color_name: str,
    visual_score: int,
    confidence: float,
    defects: list,
    citra_path: str = "",
    user_id: str = USER_ID
):
    """
    Mengirimkan data fusi multimodal (Biokimia Gas + Visual YOLO + Suhu/Warna)
    ke API CirculSense (/api/ml/inferensi-fusi) untuk langsung disimpan ke Riwayat & Laporan.
    """
    endpoint = f"{API_BASE_URL}/api/ml/inferensi-fusi"
    
    citra_base64 = encode_image_to_base64(citra_path) if citra_path else ""

    payload = {
        "id_pengguna": user_id,
        "item_name": nama_bahan,
        "category": kategori,
        "ch4_ppm": ch4_ppm,
        "aqi_ppm": aqi_ppm,
        "temperature": suhu,
        "humidity": kelembapan,
        "color_hex": color_hex,
        "color_name": color_name,
        "visual_score": visual_score,
        "confidence": confidence,
        "defects": defects,
        "image_url": citra_base64,
        "saved_weight_kg": 0.5
    }

    try:
        response = requests.post(endpoint, json=payload, timeout=10)
        if response.status_code in [200, 201]:
            res_data = response.json()
            status_text = res_data.get('data', {}).get('fusion', {}).get('status', 'Berhasil')
            score = res_data.get('data', {}).get('fusion', {}).get('freshness_score', 0)
            print(f"✓ [FUSI MULTIMODAL] Berhasil! Status: {status_text} (Skor: {score}/5)")
            return res_data
        else:
            print(f"✗ [FUSI MULTIMODAL] Gagal: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"✗ [FUSI MULTIMODAL] Error: {str(e)}")
        return None

if __name__ == "__main__":
    print("==================================================")
    print("MENGUJI PENGIRIMAN DATA ML DARI PYTHON KE WEB APP")
    print("==================================================")

    # 1. Contoh kirim hasil deteksi YOLO
    print("\n[1] Mengirim hasil inferensi YOLO...")
    kirim_hasil_yolo(
        nama_bahan="Tomat",
        kategori="Buah",
        skor_kepercayaan=0.965,
        skor_kualitas_visual=3,
        daftar_cacat=["Kulit Berkerut Halus"],
        bounding_boxes=[{"x": 100, "y": 80, "width": 240, "height": 260, "label": "Tomat Layu", "conf": 0.965}]
    )

    # 2. Contoh kirim fusi sensor multimodal lengkap
    print("\n[2] Mengirim fusi multimodal lengkap (Gas + Visual + DHT22 + TCS34725)...")
    kirim_inferensi_fusi_lengkap(
        nama_bahan="Sawi Hijau",
        kategori="Sayur",
        ch4_ppm=0.32,         # Gas Metana MQ-4 (Rendah = Segar)
        aqi_ppm=18.5,         # Gas Organik MQ-135 (Normal)
        suhu=26.4,            # DHT22 Suhu
        kelembapan=68.0,      # DHT22 Kelembapan
        color_hex="#16A34A",  # TCS34725 Hijau Daun Segar
        color_name="Hijau Klorofil Segar",
        visual_score=5,       # YOLO Visual Score
        confidence=0.98,
        defects=[]
    )
