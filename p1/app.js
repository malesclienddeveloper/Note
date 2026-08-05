if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => reg.update());
    });
}

let dataJadwal = JSON.parse(localStorage.getItem('dataJadwal')) || [];
let dataPR = JSON.parse(localStorage.getItem('dataPR')) || [];
let dataKelompok = JSON.parse(localStorage.getItem('dataKelompok')) || [];

const urutanHalaman = ['home', 'jadwal', 'pr', 'kelompok'];
let halamanAktif = 'home';

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

// ==========================================
// SISTEM PENGINGAT NOTIFIKASI (H-1)
// ==========================================
function cekNotifikasiH1() {
    if (!("Notification" in window)) return;
    
    // Minta izin jika belum
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    // Hitung tanggal besok (H-1 dari hari pengumpulan)
    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    const tglBesokStr = besok.toISOString().split('T')[0];

    // Cari tugas yang tanggal kumpulnya adalah BESOK
    const semuaTugas = [...dataPR, ...dataKelompok];
    const tugasBesok = semuaTugas.filter(t => t.tanggal === tglBesokStr);
    
    if (tugasBesok.length > 0 && Notification.permission === "granted") {
        let pesan = "Tugas yang HARUS DIKUMPULKAN BESOK:\n";
        tugasBesok.forEach(t => {
            let jenis = t.anggota ? "(Kelompok)" : "(PR)";
            pesan += `• ${t.mapel} ${jenis}\n`;
        });
        
        new Notification("PENGINGAT TUGAS! 📚", {
            body: pesan,
            icon: "https://cdn-icons-png.flaticon.com/512/3248/3248834.png"
        });
    }
}
// ==========================================


function pindahHalaman(idHalaman, elemenNav) {
    const indexLama = urutanHalaman.indexOf(halamanAktif);
    const indexBaru = urutanHalaman.indexOf(idHalaman);
    
    let animasiCSS = 'fadePage';
    if (indexBaru > indexLama) animasiCSS = 'slideLeft';
    else if (indexBaru < indexLama) animasiCSS = 'slideRight';

    halamanAktif = idHalaman;
    document.getElementById('btn-add').style.display = (idHalaman === 'home') ? 'none' : 'flex';
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.animation = 'none';
    });
    
    const pageAktif = document.getElementById('page-' + idHalaman);
    pageAktif.classList.add('active');

    if (idHalaman !== 'home') {
        pageAktif.style.animation = `${animasiCSS} 0.25s ease forwards`;
    }

    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    elemenNav.classList.add('active');
    renderData();
}

let touchstartX = 0; let touchendX = 0;
let touchstartY = 0; let touchendY = 0;
document.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; touchstartY = e.changedTouches[0].screenY; }, {passive: true});
document.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; touchendY = e.changedTouches[0].screenY; handleSwipe(); }, {passive: true});

function handleSwipe() {
    if (document.getElementById('modal').style.display === 'flex') return;
    const diffX = touchstartX - touchendX;
    const diffY = touchstartY - touchendY;
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    const threshold = 60;
    const indexSekarang = urutanHalaman.indexOf(halamanAktif);

    if (diffX > threshold && indexSekarang < urutanHalaman.length - 1) {
        pindahHalaman(urutanHalaman[indexSekarang + 1], document.querySelectorAll('.nav-item')[indexSekarang + 1]);
    } else if (diffX < -threshold && indexSekarang > 0) {
        pindahHalaman(urutanHalaman[indexSekarang - 1], document.querySelectorAll('.nav-item')[indexSekarang - 1]);
    }
}

function bukaModal() {
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('form-jadwal').style.display = 'none';
    document.getElementById('form-tugas').style.display = 'none';
    document.getElementById('t-note').style.display = 'none';
    document.getElementById('t-anggota').style.display = 'none';

    if (halamanAktif === 'jadwal') {
        document.getElementById('modal-title').innerText = 'Tambah Jadwal';
        document.getElementById('form-jadwal').style.display = 'block';
    } else if (halamanAktif === 'pr') {
        document.getElementById('modal-title').innerText = 'Tambah PR Baru';
        document.getElementById('form-tugas').style.display = 'block';
        document.getElementById('t-note').style.display = 'block'; // Tampilkan Note untuk PR
    } else if (halamanAktif === 'kelompok') {
        document.getElementById('modal-title').innerText = 'Tugas Kelompok';
        document.getElementById('form-tugas').style.display = 'block';
        document.getElementById('t-anggota').style.display = 'block';
    }
}

function tutupModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('j-mapel').value = '';
    document.getElementById('t-mapel').value = '';
    document.getElementById('t-note').value = '';
    document.getElementById('t-anggota').value = '';
}

function cariTanggalTerdekat(mapelCari) {
    const hariIndex = { 'Ahad': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
    const jadwalMapel = dataJadwal.filter(j => j.mapel.toLowerCase().trim() === mapelCari.toLowerCase().trim());
    if (jadwalMapel.length === 0) return null; 

    let hariIni = new Date();
    let indexHariIni = hariIni.getDay(); 
    let selisihHariTerkecil = 99;

    jadwalMapel.forEach(j => {
        let targetIndex = hariIndex[j.hari];
        let selisih = targetIndex - indexHariIni;
        if (selisih <= 0) selisih += 7; 
        if (selisih < selisihHariTerkecil) selisihHariTerkecil = selisih;
    });

    let tanggalTarget = new Date();
    tanggalTarget.setDate(hariIni.getDate() + selisihHariTerkecil);
    return tanggalTarget.toISOString().split('T')[0]; 
}

function simpanData() {
    const id = Date.now();
    if (halamanAktif === 'jadwal') {
        const hari = document.getElementById('j-hari').value;
        const mapel = document.getElementById('j-mapel').value;
        if(!mapel) return alert("Mapel harus diisi!");
        dataJadwal.push({ id, hari, mapel });
        localStorage.setItem('dataJadwal', JSON.stringify(dataJadwal));
    } else {
        const mapel = document.getElementById('t-mapel').value;
        if(!mapel) return alert("Mata pelajaran harus diisi!");

        const tanggalOtomatis = cariTanggalTerdekat(mapel);
        if (!tanggalOtomatis) {
            alert(`Mapel "${mapel}" tidak ditemukan di Jadwal Mingguan! Harap tambahkan ke Jadwal terlebih dahulu.`);
            return;
        }

        if (halamanAktif === 'pr') {
            const note = document.getElementById('t-note').value;
            dataPR.push({ id, mapel, tanggal: tanggalOtomatis, note });
            localStorage.setItem('dataPR', JSON.stringify(dataPR));
        } else if (halamanAktif === 'kelompok') {
            const anggota = document.getElementById('t-anggota').value;
            dataKelompok.push({ id, mapel, tanggal: tanggalOtomatis, anggota });
            localStorage.setItem('dataKelompok', JSON.stringify(dataKelompok));
        }
    }
    tutupModal();
    renderData();
}

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

// BUKA/TUTUP NOTE PR
function toggleNote(id) {
    const noteEl = document.getElementById(`note-${id}`);
    if(noteEl) {
        noteEl.style.display = (noteEl.style.display === 'none' || noteEl.style.display === '') ? 'block' : 'none';
    }
}

function formatTanggalIndo(tglStr) {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return new Date(tglStr).toLocaleDateString('id-ID', options);
}

function renderData() {
    const homeList = document.getElementById('home-pr-list');
    homeList.innerHTML = '';
    const semuaTugas = [...dataPR, ...dataKelompok];
    semuaTugas.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    if (semuaTugas.length === 0) {
        homeList.innerHTML = `<div class="all-done">🎉 Anda bebas tugas!</div>`;
    } else {
        semuaTugas.forEach(d => {
            let info = d.anggota ? `👥` : `📝`;
            homeList.innerHTML += `
                <li>
                    <strong>${info} ${d.mapel}</strong> 
                    <span style="font-size:12px; opacity:0.8;">${formatTanggalIndo(d.tanggal)}</span>
                </li>`;
        });
    }

    const listJ = document.getElementById('list-jadwal');
    listJ.innerHTML = '';
    const urutanHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
    urutanHari.forEach(hari => {
        const mapelHariIni = dataJadwal.filter(j => j.hari === hari);
        let htmlMapel = '';
        if (mapelHariIni.length === 0) {
            htmlMapel = `<li style="justify-content:center; color:#bbb; border:none; font-style:italic;">Libur / Kosong</li>`;
        } else {
            mapelHariIni.forEach(m => {
                htmlMapel += `<li>${m.mapel} <button onclick="hapusData('jadwal', ${m.id})">✖</button></li>`;
            });
        }
        listJ.innerHTML += `
            <div class="note-card">
                <h4>${hari}</h4>
                <ul>${htmlMapel}</ul>
            </div>`;
    });

    // Render PR dengan fitur Klik untuk Lihat Note
    const listP = document.getElementById('list-pr');
    listP.innerHTML = '';
    dataPR.forEach(d => {
        // Jika ada note, siapkan elemen dropdown-nya
        let htmlNote = d.note ? `<div class="pr-note" id="note-${d.id}"><strong>Catatan:</strong><br>${d.note}</div>` : '';
        let hintTunjuk = d.note ? `<span style="color:var(--primary); font-size:10px; margin-left:5px;">(Tap untuk note)</span>` : '';
        
        listP.innerHTML += `
            <div class="list-card" style="border-left-color: #FF9800; cursor:pointer;" onclick="toggleNote(${d.id})">
                <div class="list-info">
                    <h4>${d.mapel} ${hintTunjuk}</h4>
                    <p>Kumpul: ${formatTanggalIndo(d.tanggal)}</p>
                    ${htmlNote}
                </div>
                <button class="btn-del" onclick="event.stopPropagation(); hapusData('pr', ${d.id})">Selesai</button>
            </div>`;
    });

    const listK = document.getElementById('list-kelompok');
    listK.innerHTML = '';
    dataKelompok.forEach(d => {
        listK.innerHTML += `
            <div class="list-card" style="border-left-color: #4CAF50;">
                <div class="list-info">
                    <h4>${d.mapel}</h4>
                    <p>Kumpul: ${formatTanggalIndo(d.tanggal)} <br> 👥: <strong>${d.anggota || '-'}</strong></p>
                </div>
                <button class="btn-del" onclick="hapusData('kelompok', ${d.id})">Selesai</button>
            </div>`;
    });
}

setWaktu();
renderData();
cekNotifikasiH1(); // Panggil pengecekan notifikasi saat web dibuka