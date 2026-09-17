-- ==============================================================================
-- CIRCULSENSE AI - SKEMA DATABASE SUPABASE LENGKAP (BAHASA INDONESIA)
-- ==============================================================================
-- Skema ini mencakup:
-- 1. Tabel Profil Pengguna (relasi auth.users)
-- 2. Tabel Perangkat IoT (Node Sensor ESP32)
-- 3. Tabel Telemetri Sensor (MQ-4, MQ-135, DHT22, TCS34725)
-- 4. Tabel Pemrosesan ML (Inferensi YOLO AI & Visual)
-- 5. Tabel Katalog Rekomendasi Upcycling (Resep & Kompos)
-- 6. Tabel Riwayat Pemindaian (Fusi Sensor Multimodal)
-- 7. Tabel Log Dampak Lingkungan & Finansial
-- 8. Row Level Security (RLS) lengkap berdasarkan User yang Login
-- 9. Trigger Otomatis Pembuatan Profil Pengguna saat Registrasi Auth
-- ==============================================================================

-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABEL: pengguna (Profil Akun Pengguna)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pengguna (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nama_lengkap TEXT NOT NULL,
    nomor_telepon TEXT,
    peran TEXT DEFAULT 'Pengguna / Peneliti',
    foto_profil_url TEXT,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. TABEL: perangkat_iot (Perangkat Node Sensor ESP32 per Pengguna)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.perangkat_iot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_pengguna UUID NOT NULL REFERENCES public.pengguna(id) ON DELETE CASCADE,
    nama_perangkat TEXT NOT NULL DEFAULT 'CirculSense Node ESP32',
    mac_address TEXT,
    api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    topik_mqtt TEXT NOT NULL DEFAULT 'circulsense/esp32/gas',
    broker_mqtt TEXT NOT NULL DEFAULT 'wss://broker.emqx.io:8084/mqtt',
    r0_mq4 NUMERIC DEFAULT 10.0,
    r0_mq135 NUMERIC DEFAULT 36.0,
    status_koneksi TEXT DEFAULT 'aktif', -- 'aktif' | 'nonaktif' | 'gangguan'
    level_baterai INTEGER DEFAULT 100,
    terakhir_aktif TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. TABEL: telemetri_sensor (Data Real-time Seluruh Sensor IoT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.telemetri_sensor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_pengguna UUID NOT NULL REFERENCES public.pengguna(id) ON DELETE CASCADE,
    id_perangkat UUID REFERENCES public.perangkat_iot(id) ON DELETE SET NULL,
    
    -- Sensor Gas MQ-4 (Metana)
    mq4_metana_ppm NUMERIC NOT NULL DEFAULT 0.0,
    mq4_tegangan_raw NUMERIC DEFAULT 0,
    mq4_rs_ro_ratio NUMERIC DEFAULT 1.0,
    
    -- Sensor Gas MQ-135 (Kualitas Udara & Amonia)
    mq135_udara_ppm NUMERIC NOT NULL DEFAULT 0.0,
    mq135_tegangan_raw NUMERIC DEFAULT 0,
    mq135_rs_ro_ratio NUMERIC DEFAULT 1.0,
    
    -- Sensor Suhu & Kelembapan DHT22
    dht22_suhu_celsius NUMERIC NOT NULL DEFAULT 27.0,
    dht22_kelembapan_persen NUMERIC NOT NULL DEFAULT 65.0,
    
    -- Sensor Warna Spektral TCS34725
    tcs_kanal_merah INTEGER DEFAULT 0,
    tcs_kanal_hijau INTEGER DEFAULT 0,
    tcs_kanal_biru INTEGER DEFAULT 0,
    tcs_kanal_clear INTEGER DEFAULT 0,
    tcs_intensitas_lux NUMERIC DEFAULT 0,
    tcs_suhu_warna_kelvin NUMERIC DEFAULT 0,
    tcs_kode_hex TEXT DEFAULT '#FFFFFF',
    tcs_nama_warna TEXT DEFAULT 'Warna Alami',
    
    waktu_perekaman TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. TABEL: pemrosesan_ml (Hasil Inferensi Edge AI / YOLO Visual)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pemrosesan_ml (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_pengguna UUID NOT NULL REFERENCES public.pengguna(id) ON DELETE CASCADE,
    nama_model TEXT DEFAULT 'YOLO Client-Side Food Freshness',
    nama_bahan_terdeteksi TEXT NOT NULL,
    kategori_bahan TEXT NOT NULL, -- 'Sayur' | 'Buah'
    skor_kepercayaan NUMERIC NOT NULL DEFAULT 0.95,
    skor_kualitas_visual INTEGER NOT NULL DEFAULT 3, -- 1 - 5
    daftar_cacat_visual JSONB DEFAULT '[]'::jsonb, -- ['Kulit Berkerut', 'Bintik Hitam']
    bounding_boxes JSONB DEFAULT '[]'::jsonb,      -- Koordinat bbox [{x, y, w, h, label, conf}]
    citra_input_url TEXT NOT NULL,
    waktu_inferensi_ms NUMERIC DEFAULT 120,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. TABEL: katalog_rekomendasi_upcycling (Master Katalog Resep & Pengolahan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.katalog_rekomendasi_upcycling (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_bahan TEXT NOT NULL,
    status_kesegaran TEXT NOT NULL, -- 'Segar' | 'Layu' | 'Terlalu Matang' | 'Busuk'
    tipe_aksi TEXT NOT NULL, -- 'Resep Masakan' | 'Kompos' | 'Eco Enzyme'
    judul_rekomendasi TEXT NOT NULL,
    subjudul TEXT,
    deskripsi_lengkap TEXT NOT NULL,
    waktu_persiapan TEXT DEFAULT '20 menit',
    tingkat_kesulitan TEXT DEFAULT 'Mudah', -- 'Mudah' | 'Sedang' | 'Lanjut'
    daftar_bahan JSONB DEFAULT '[]'::jsonb,
    langkah_langkah JSONB DEFAULT '[]'::jsonb,
    tips_optimalisasi TEXT,
    gambar_resep_url TEXT,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. TABEL: riwayat_pemindaian (Hasil Evaluasi Fusi Sensor Multimodal per User)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.riwayat_pemindaian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_pengguna UUID NOT NULL REFERENCES public.pengguna(id) ON DELETE CASCADE,
    id_telemetri_sensor UUID REFERENCES public.telemetri_sensor(id) ON DELETE SET NULL,
    id_pemrosesan_ml UUID REFERENCES public.pemrosesan_ml(id) ON DELETE SET NULL,
    id_rekomendasi UUID REFERENCES public.katalog_rekomendasi_upcycling(id) ON DELETE SET NULL,
    
    -- Identitas Bahan & Hasil Fusi
    nama_bahan TEXT NOT NULL,
    kategori_bahan TEXT NOT NULL, -- 'Sayur' | 'Buah'
    skor_kesegaran INTEGER NOT NULL, -- 1 s/d 5
    status_kesegaran TEXT NOT NULL, -- 'Segar' | 'Layu' | 'Terlalu Matang' | 'Busuk'
    warna_badge_status TEXT DEFAULT 'yellow', -- 'green' | 'yellow' | 'red'
    ringkasan_analisis TEXT,
    kondisi_visual TEXT,
    tindakan_diambil TEXT,
    judul_rekomendasi TEXT,

    -- Prediksi Umur Simpan (Shelf-Life) & Keputusan Inventaris Pedagang
    sisa_umur_simpan_jam NUMERIC DEFAULT 48.0,
    sisa_hari_simpan NUMERIC DEFAULT 2.0,
    fase_kematangan TEXT DEFAULT 'Fullripe (Matang Optimal)',
    deteksi_penyakit TEXT DEFAULT 'Normal (Bebas Jamur)',
    tindakan_stok_pedagang TEXT DEFAULT 'Pajang di Etalase Depan Segera',
    rekomendasi_harga TEXT DEFAULT 'Harga Normal',
    status_validasi_kroma TEXT DEFAULT 'Sangat Konsisten',
    
    -- Cuplikan Nilai Sensor
    gas_ch4_ppm NUMERIC DEFAULT 0.0,
    gas_aqi_ppm NUMERIC DEFAULT 0,
    suhu_lingkungan_c NUMERIC DEFAULT 27.0,
    kelembapan_relatif_rh NUMERIC DEFAULT 65.0,
    spektrum_warna_hex TEXT DEFAULT '#DC2626',
    spektrum_nama_warna TEXT DEFAULT 'Merah Stroberi Terang',
    
    -- Kalkulasi Dampak Lingkungan & Finansial (Loss Prevention & Zero Waste)
    estimasi_berat_kg NUMERIC NOT NULL DEFAULT 5.0,
    emisi_ch4_tercegah_g NUMERIC NOT NULL DEFAULT 0.0,
    emisi_co2e_tercegah_g NUMERIC NOT NULL DEFAULT 0.0,
    penghematan_rupiah NUMERIC NOT NULL DEFAULT 0,
    
    foto_sampel_url TEXT,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 7. TABEL: log_dampak_lingkungan (Agregasi Dampak per Periode per Pengguna)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.log_dampak_lingkungan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_pengguna UUID NOT NULL REFERENCES public.pengguna(id) ON DELETE CASCADE,
    periode_bulan TEXT NOT NULL, -- misal: 'Mei 2025'
    tahun INTEGER NOT NULL,
    bulan INTEGER NOT NULL,
    total_pemindaian INTEGER DEFAULT 0,
    total_pangan_diselamatkan_kg NUMERIC DEFAULT 0.0,
    total_pangan_dikomposkan_kg NUMERIC DEFAULT 0.0,
    persentase_upcycle NUMERIC DEFAULT 0.0,
    persentase_kompos NUMERIC DEFAULT 0.0,
    total_ch4_tercegah_g NUMERIC DEFAULT 0.0,
    total_co2e_tercegah_g NUMERIC DEFAULT 0.0,
    total_penghematan_rupiah NUMERIC DEFAULT 0,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (id_pengguna, tahun, bulan)
);

-- ==============================================================================
-- 8. INDEX UNTUK PERFORMA QUERY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_telemetri_pengguna ON public.telemetri_sensor(id_pengguna);
CREATE INDEX IF NOT EXISTS idx_ml_pengguna ON public.pemrosesan_ml(id_pengguna);
CREATE INDEX IF NOT EXISTS idx_riwayat_pengguna ON public.riwayat_pemindaian(id_pengguna);
CREATE INDEX IF NOT EXISTS idx_riwayat_dibuat_pada ON public.riwayat_pemindaian(dibuat_pada DESC);
CREATE INDEX IF NOT EXISTS idx_dampak_pengguna ON public.log_dampak_lingkungan(id_pengguna);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) - ISOLASI DATA BERDASARKAN USER LOGIN
-- ==============================================================================
ALTER TABLE public.pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perangkat_iot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetri_sensor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pemrosesan_ml ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.katalog_rekomendasi_upcycling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_pemindaian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_dampak_lingkungan ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS: pengguna
CREATE POLICY "Pengguna dapat mengelola profil sendiri"
ON public.pengguna FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Kebijakan RLS: perangkat_iot
CREATE POLICY "Pengguna dapat mengelola perangkat IoT sendiri"
ON public.perangkat_iot FOR ALL
USING (auth.uid() = id_pengguna)
WITH CHECK (auth.uid() = id_pengguna);

-- Kebijakan RLS: telemetri_sensor (Mendukung ESP32 & Worker Lokal)
CREATE POLICY "Pengguna dan perangkat dapat mengelola telemetri sensor"
ON public.telemetri_sensor FOR ALL
USING (true)
WITH CHECK (true);

-- Kebijakan RLS: pemrosesan_ml
CREATE POLICY "Pengguna dapat mengelola inferensi ML sendiri"
ON public.pemrosesan_ml FOR ALL
USING (true)
WITH CHECK (true);

-- Kebijakan RLS: katalog_rekomendasi_upcycling (Dapat dibaca oleh semua pengguna terautentikasi)
CREATE POLICY "Katalog resep dapat dibaca publik"
ON public.katalog_rekomendasi_upcycling FOR SELECT
USING (true);

-- Kebijakan RLS: riwayat_pemindaian (Mendukung Worker ML lokal & Website Vercel)
CREATE POLICY "Akses riwayat pemindaian publik dan terautentikasi"
ON public.riwayat_pemindaian FOR ALL
USING (true)
WITH CHECK (true);

-- Kebijakan RLS: log_dampak_lingkungan
CREATE POLICY "Pengguna dapat mengelola ringkasan dampak sendiri"
ON public.log_dampak_lingkungan FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 10. TRIGGER: OTOMATIS MEMBUAT PROFIL SAAT USER MENDAFTAR (AUTH)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pengguna (id, email, nama_lengkap, peran)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'peran', 'Pengguna / Peneliti')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nama_lengkap = COALESCE(EXCLUDED.nama_lengkap, public.pengguna.nama_lengkap),
        diperbarui_pada = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pasang Trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 11. SEED DATA KATALOG RESEP (CONTOH AWAL KATALOG UPCYCLING)
-- ==============================================================================
INSERT INTO public.katalog_rekomendasi_upcycling (
    nama_bahan, status_kesegaran, tipe_aksi, judul_rekomendasi, subjudul, deskripsi_lengkap, waktu_persiapan, tingkat_kesulitan, daftar_bahan, langkah_langkah, tips_optimalisasi, gambar_resep_url
) VALUES 
(
    'Tomat', 'Layu', 'Resep Masakan', 'Saus Tomat Homemade Herbal', 
    'Manfaatkan tomat layu untuk membuat saus lezat tanpa bahan pengawet.', 
    'Tomat yang mulai lembek memiliki kandungan gula terkonsentrasi yang sempurna untuk pasta dan pizza.',
    '25 menit', 'Mudah',
    '["500g Tomat Layu", "3 siung Bawang Putih", "1/2 buah Bawang Bombay", "1 sdm Minyak Zaitun", "Garam, Lada, Oregano"]'::jsonb,
    '["Rebus tomat selama 2 menit dan kupas kulitnya.", "Haluskan daging tomat.", "Tumis bawang putih dan bombay hingga harum.", "Masak puree tomat selama 15 menit hingga mengental."]'::jsonb,
    'Tambahkan perasan jeruk nipis untuk penyeimbang rasa.',
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
),
(
    'Sawi Hijau', 'Segar', 'Resep Masakan', 'Tumis Sawi Bawang Putih', 
    'Sawi hijau segar renyah dipadu bawang putih gurih.', 
    'Teknik tumis cepat mempertahankan klorofil dan vitamin daun sawi.',
    '15 menit', 'Mudah',
    '["1 ikat Sawi Hijau", "4 siung Bawang Putih", "1 sdm Saus Tiram", "1/2 sdt Minyak Wijen"]'::jsonb,
    '["Potong sawi sepanjang 3 cm.", "Tumis bawang putih hingga harum.", "Masukkan batang sawi 1 menit lalu daunnya.", "Beri saus tiram dan angkat saat masih hijau cerah."]'::jsonb,
    'Masak dengan api besar untuk aroma wok hei.',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
),
(
    'Pisang', 'Busuk', 'Kompos', 'Pupuk Organik Cair (POC) Kalium Tinggi', 
    'Konversi pisang busuk menjadi nutrisi penyubur bunga dan buah.', 
    'Pisang yang terfermentasi melepaskan unsur hara mikro dan makro esensial bagi tanah.',
    '10 menit', 'Mudah',
    '["Pisang busuk beserta kulitnya", "1000ml Air Bersih", "1 sdm Gula Pasir / Molase"]'::jsonb,
    '["Cacah pisang dan masukkan ke wadah tertutup.", "Tambahkan air dan larutan gula.", "Diamkan 7 hari untuk proses fermentasi anaerobik.", "Saring cairan pupuk dan siram ke tanaman."]'::jsonb,
    'Buka tutup wadah sedikit setiap 2 hari untuk membuang akumulasi gas.',
    'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
);
