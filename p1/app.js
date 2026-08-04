// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

// Data Storage
let dataJadwal = JSON.parse(localStorage.getItem('dataJadwal')) || [];
let dataPR = JSON.parse(localStorage.getItem('dataPR')) || [];
let dataKelompok = JSON.parse(localStorage.getItem('dataKelompok')) || [];

let halamanAktif = 'home';

// Fungsi Sapaan Waktu Otomatis
function setWaktu() {
    const jam = new Date().getHours();
    let sapaan = "Selamat Malam";
    if (jam >= 4 && jam < 11) sapaan = "Selamat Pagi";
    else if (jam >= 11 && jam < 15) sapaan = "Selamat Siang";
    else if (jam >= 15 && jam < 18) sapaan = "Selamat Sore";
    
    document.getElementById('sapaan').innerText = sapaan;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('tanggal-hari').innerText = new Date().toLocaleDateString('id-ID', options);
}

// Navigasi Pindah Halaman
function pindahHalaman(idHalaman, elemenNav) {
    halamanAktif = idHalaman;
    
    // Tampilkan/Sembunyikan Tombol Plus
    document.getElementById('btn-add').style.display = (idHalaman === 'home') ? 'none' : 'flex';

    // Sembunyikan semua page, tampilkan yang dipilih
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('page-' + idHalaman).classList.add('active');

    // Ubah warna tombol navigasi bawah
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    elemenNav.classList.add('active');

    renderData();
}

// Modal Form
function bukaModal() {
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('form-jadwal').style.display = 'none';
    document.getElementById('form-tugas').style.display = 'none';
    document.getElementById('t-anggota').style.display = 'none';

    if (halamanAktif === 'jadwal') {
        document.getElementById('modal-title').innerText = 'Tambah Jadwal';
        document.getElementById('form-jadwal').style.display = 'block';
    } else if (halamanAktif === 'pr') {
        document.getElementById('modal-title').innerText = 'Tambah PR';
        document.getElementById('form-tugas').style.display = 'block';
    } else if (halamanAktif === 'kelompok') {
        document.getElementById('modal-title').innerText = 'Tambah Tugas Kelompok';
        document.getElementById('form-tugas').style.display = 'block';
        document.getElementById('t-anggota').style.display = 'block';
    }
}

function tutupModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('j-mapel').value = '';
    document.getElementById('t-mapel').value = '';
    document.getElementById('t-anggota').value = '';
}

// MENGHITUNG TANGGAL OTOMATIS BERDASARKAN JADWAL
function cariTanggalTerdekat(mapelCari) {
    const hariIndex = { 'Ahad': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
    
    // Cari semua hari dimana mapel tersebut diajarkan (Case Insensitive)
    const jadwalMapel = dataJadwal.filter(j => j.mapel.toLowerCase().trim() === mapelCari.toLowerCase().trim());

    if (jadwalMapel.length === 0) return null; // Mapel tidak ada di jadwal

    let hariIni = new Date();
    let indexHariIni = hariIni.getDay(); // 0-6

    let selisihHariTerkecil = 99;

    // Cari jadwal yang paling dekat harinya dari hari ini
    jadwalMapel.forEach(j => {
        let targetIndex = hariIndex[j.hari];
        let selisih = targetIndex - indexHariIni;
        
        // Jika harinya sudah lewat minggu ini, atau hari ini (berarti kumpul minggu depan)
        if (selisih <= 0) selisih += 7; 
        
        if (selisih < selisihHariTerkecil) selisihHariTerkecil = selisih;
    });

    // Buat tanggal target
    let tanggalTarget = new Date();
    tanggalTarget.setDate(hariIni.getDate() + selisihHariTerkecil);

    return tanggalTarget.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

// Simpan Data
function simpanData() {
    const id = Date.now();
    if (halamanAktif === 'jadwal') {
        const hari = document.getElementById('j-hari').value;
        const mapel = document.getElementById('j-mapel').value;
        if(!mapel) return alert("Mapel harus diisi!");
        dataJadwal.push({ id, hari, mapel });
        localStorage.setItem('dataJadwal', JSON.stringify(dataJadwal));
    } 
    else {
        const mapel = document.getElementById('t-mapel').value;
        if(!mapel) return alert("Mata pelajaran harus diisi!");

        // Dapatkan tanggal otomatis
        const tanggalOtomatis = cariTanggalTerdekat(mapel);
        if (!tanggalOtomatis) {
            alert(`Mapel "${mapel}" tidak ditemukan di Jadwal! Silakan tambahkan ke Jadwal terlebih dahulu agar sistem tahu hari pengumpulannya.`);
            return;
        }

        if (halamanAktif === 'pr') {
            dataPR.push({ id, mapel, tanggal: tanggalOtomatis });
            localStorage.setItem('dataPR', JSON.stringify(dataPR));
        }
        else if (halamanAktif === 'kelompok') {
            const anggota = document.getElementById('t-anggota').value;
            dataKelompok.push({ id, mapel, tanggal: tanggalOtomatis, anggota });
            localStorage.setItem('dataKelompok', JSON.stringify(dataKelompok));
        }
    }

    tutupModal();
    renderData();
}

// Hapus Data
function hapusData(tipe, id) {
    if (tipe === 'jadwal') {
        dataJadwal = dataJadwal.filter(d => d.id !== id);
        localStorage.setItem('dataJadwal', JSON.stringify(dataJadwal));
    } else if (tipe === 'pr') {
        dataPR = dataPR.filter(d => d.id !== id);
        localStorage.setItem('dataPR', JSON.stringify(dataPR));
    } else if (tipe === 'kelompok') {
        dataKelompok = dataKelompok.filter(d => d.id !== id);
        localStorage.setItem('dataKelompok', JSON.stringify(dataKelompok));
    }
    renderData();
}

// Format Tanggal untuk Tampilan Indonesia
function formatTanggalIndo(tglStr) {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return new Date(tglStr).toLocaleDateString('id-ID', options);
}

// Render Data ke Layar
function renderData() {
    // 1. Render Home (Tugas Mendatang)
    const homeList = document.getElementById('home-pr-list');
    homeList.innerHTML = '';
    const semuaTugas = [...dataPR, ...dataKelompok];
    
    // Urutkan tugas berdasarkan tanggal terdekat
    semuaTugas.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    if (semuaTugas.length === 0) {
        homeList.innerHTML = `<div class="all-done">All done 🎉</div>`;
    } else {
        semuaTugas.forEach(d => {
            let info = d.anggota ? `(Kelompok)` : `(PR)`;
            homeList.innerHTML += `
                <li>
                    <strong>${d.mapel} ${info}</strong> 
                    <span style="font-size:12px; opacity:0.8;">${formatTanggalIndo(d.tanggal)}</span>
                </li>`;
        });
    }

    // 2. Render Jadwal (Model Note 7 Hari)
    const listJ = document.getElementById('list-jadwal');
    listJ.innerHTML = '';
    const urutanHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
    
    urutanHari.forEach(hari => {
        const mapelHariIni = dataJadwal.filter(j => j.hari === hari);
        let htmlMapel = '';
        
        if (mapelHariIni.length === 0) {
            htmlMapel = `<li style="justify-content:center; color:#bbb; border:none; font-style:italic;">Kosong</li>`;
        } else {
            mapelHariIni.forEach(m => {
                htmlMapel += `<li>${m.mapel} <button onclick="hapusData('jadwal', ${m.id})">✖</button></li>`;
            });
        }

        listJ.innerHTML += `
            <div class="note-card">
                <h4>${hari}</h4>
                <ul>${htmlMapel}</ul>
            </div>
        `;
    });

    // 3. Render PR
    const listP = document.getElementById('list-pr');
    listP.innerHTML = '';
    dataPR.forEach(d => {
        listP.innerHTML += `
            <div class="list-card" style="border-left-color: #FF9800;">
                <div class="list-info"><h4>${d.mapel}</h4><p>Kumpul: ${formatTanggalIndo(d.tanggal)}</p></div>
                <button class="btn-del" onclick="hapusData('pr', ${d.id})">Selesai</button>
            </div>`;
    });

    // 4. Render Kelompok
    const listK = document.getElementById('list-kelompok');
    listK.innerHTML = '';
    dataKelompok.forEach(d => {
        listK.innerHTML += `
            <div class="list-card" style="border-left-color: #4CAF50;">
                <div class="list-info"><h4>${d.mapel}</h4><p>Kumpul: ${formatTanggalIndo(d.tanggal)} <br> Anggota: ${d.anggota || '-'}</p></div>
                <button class="btn-del" onclick="hapusData('kelompok', ${d.id})">Selesai</button>
            </div>`;
    });
}

// Inisialisasi awal
setWaktu();
renderData();