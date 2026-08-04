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
function pindahHalaman(idHalaman, elemenNav, judul) {
    halamanAktif = idHalaman;
    
    // Ubah Judul Atas
    document.getElementById('header-title').innerText = judul;
    
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

// Modal Form (Pintar: Menyesuaikan halaman yang sedang dibuka)
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
    // Reset input
    document.getElementById('j-mapel').value = '';
    document.getElementById('t-mapel').value = '';
    document.getElementById('t-tanggal').value = '';
    document.getElementById('t-anggota').value = '';
}

// Simpan Data
function simpanData() {
    const id = Date.now();
    if (halamanAktif === 'jadwal') {
        const hari = document.getElementById('j-hari').value;
        const mapel = document.getElementById('j-mapel').value;
        const jam = document.getElementById('j-jam').value;
        if(!mapel) return alert("Mapel harus diisi!");
        dataJadwal.push({ id, hari, mapel, jam });
        localStorage.setItem('dataJadwal', JSON.stringify(dataJadwal));
    } 
    else if (halamanAktif === 'pr') {
        const mapel = document.getElementById('t-mapel').value;
        const tanggal = document.getElementById('t-tanggal').value;
        if(!mapel || !tanggal) return alert("Mapel dan Tanggal harus diisi!");
        dataPR.push({ id, mapel, tanggal });
        localStorage.setItem('dataPR', JSON.stringify(dataPR));
    }
    else if (halamanAktif === 'kelompok') {
        const mapel = document.getElementById('t-mapel').value;
        const tanggal = document.getElementById('t-tanggal').value;
        const anggota = document.getElementById('t-anggota').value;
        if(!mapel || !tanggal) return alert("Mapel dan Tanggal harus diisi!");
        dataKelompok.push({ id, mapel, tanggal, anggota });
        localStorage.setItem('dataKelompok', JSON.stringify(dataKelompok));
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

// Render (Tampilkan) Data ke Layar
function renderData() {
    // Render Jadwal
    const listJ = document.getElementById('list-jadwal');
    listJ.innerHTML = '';
    dataJadwal.forEach(d => {
        listJ.innerHTML += `
            <div class="list-card">
                <div class="list-info"><h4>${d.mapel}</h4><p>${d.hari}, Jam: ${d.jam || '-'}</p></div>
                <button class="btn-del" onclick="hapusData('jadwal', ${d.id})">Hapus</button>
            </div>`;
    });

    // Render PR
    const listP = document.getElementById('list-pr');
    listP.innerHTML = '';
    dataPR.forEach(d => {
        listP.innerHTML += `
            <div class="list-card" style="border-left-color: #FF9800;">
                <div class="list-info"><h4>${d.mapel}</h4><p>Tenggat: ${d.tanggal}</p></div>
                <button class="btn-del" onclick="hapusData('pr', ${d.id})">Selesai</button>
            </div>`;
    });

    // Render Kelompok
    const listK = document.getElementById('list-kelompok');
    listK.innerHTML = '';
    dataKelompok.forEach(d => {
        listK.innerHTML += `
            <div class="list-card" style="border-left-color: #4CAF50;">
                <div class="list-info"><h4>${d.mapel}</h4><p>Tenggat: ${d.tanggal} <br> Anggota: ${d.anggota || '-'}</p></div>
                <button class="btn-del" onclick="hapusData('kelompok', ${d.id})">Selesai</button>
            </div>`;
    });
}

// Inisialisasi awal
setWaktu();
renderData();