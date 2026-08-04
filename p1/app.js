// Register Service Worker & Notifikasi (Offline Mode & Pop-up)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Error:', err));
    });
}
if ("Notification" in window) { Notification.requestPermission(); }

// Fungsi Sapaan Waktu Otomatis
function setSapaan() {
    const jam = new Date().getHours();
    let sapaan = "Selamat Malam";
    if (jam >= 4 && jam < 11) sapaan = "Selamat Pagi";
    else if (jam >= 11 && jam < 15) sapaan = "Selamat Siang";
    else if (jam >= 15 && jam < 18) sapaan = "Selamat Sore";
    
    document.getElementById('teksSapaan').innerText = sapaan + ",";
}

// Data Array PR
let daftarPR = JSON.parse(localStorage.getItem('dataPR')) || [];
let tabAktif = 'Semua';

// Simpan Tugas
function simpanTugas() {
    const kategori = document.getElementById('kategori').value;
    const mapel = document.getElementById('mapel').value;
    const tanggal = document.getElementById('tanggal').value;
    const kelompok = document.getElementById('kelompok').value;

    if(!mapel) {
        alert("Judul / Mapel wajib diisi!");
        return;
    }
    // Jika bukan catatan biasa, tanggal wajib diisi
    if(kategori !== 'Catatan' && !tanggal) {
        alert("Tanggal pengumpulan wajib diisi untuk PR/Tugas!");
        return;
    }

    const tugas = { id: Date.now(), kategori, mapel, tanggal, kelompok };
    daftarPR.push(tugas);
    localStorage.setItem('dataPR', JSON.stringify(daftarPR));
    
    document.getElementById('mapel').value = '';
    document.getElementById('tanggal').value = '';
    document.getElementById('kelompok').value = '';
    
    tampilkanTugas();
    cekPengingatBesok();
}

// Hapus Tugas
function hapusTugas(id) {
    daftarPR = daftarPR.filter(tugas => tugas.id !== id);
    localStorage.setItem('dataPR', JSON.stringify(daftarPR));
    tampilkanTugas();
    cekPengingatBesok();
}

// Logika Tab Navigasi
function ubahTab(kategori, elemenTab) {
    tabAktif = kategori;
    
    // Ubah warna tab aktif
    let tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    elemenTab.classList.add('active');

    // Ubah Judul
    document.getElementById('judulTab').innerText = kategori === 'Semua' ? 'Semua Tugas & Catatan' : 'Kategori: ' + kategori;
    
    tampilkanTugas();
}

// Menampilkan Data sesuai Tab
function tampilkanTugas() {
    const list = document.getElementById('daftarTugas');
    list.innerHTML = '';
    
    // Filter data berdasarkan tab aktif
    let dataTampil = daftarPR;
    if (tabAktif !== 'Semua') {
        dataTampil = daftarPR.filter(tugas => tugas.kategori === tabAktif);
    }

    if (dataTampil.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#888; font-size:12px; margin-top:20px;">Belum ada data di kategori ini.</p>`;
        return;
    }

    dataTampil.forEach(tugas => {
        let detailTambahan = '';
        if(tugas.tanggal) detailTambahan += `📅 ${tugas.tanggal} `;
        if(tugas.kelompok) detailTambahan += `| 👥 ${tugas.kelompok}`;
        
        list.innerHTML += `
            <li class="task-item">
                <div class="task-info">
                    <h4><span style="font-size:10px; background:#eee; padding:2px 5px; border-radius:4px;">${tugas.kategori}</span> ${tugas.mapel}</h4>
                    <p>${detailTambahan}</p>
                </div>
                <button class="btn-selesai" onclick="hapusTugas(${tugas.id})">Selesai</button>
            </li>`;
    });
}

// Mengecek PR Besok
function cekPengingatBesok() {
    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    const tglBesokStr = besok.toISOString().split('T')[0];

    // Cek yang kategorinya PR atau Kelompok dan tanggalnya besok
    const prBesok = daftarPR.filter(tugas => (tugas.kategori === 'PR' || tugas.kategori === 'Kelompok') && tugas.tanggal === tglBesokStr);
    
    const alertBox = document.getElementById('reminderAlert');
    const listBesok = document.getElementById('besokList');
    
    if (prBesok.length > 0) {
        alertBox.style.display = 'block';
        listBesok.innerHTML = '';
        let pesanNotif = "Harus dikumpulkan besok:\n";
        
        prBesok.forEach(tugas => {
            listBesok.innerHTML += `<li>- ${tugas.mapel} (${tugas.kategori})</li>`;
            pesanNotif += `- ${tugas.mapel}\n`;
        });

        // Trigger Notifikasi Pop-up HP
        if (Notification.permission === "granted") {
            new Notification("PENGINGAT PR BESOK! 📚", {
                body: pesanNotif,
                icon: "https://cdn-icons-png.flaticon.com/512/3248/3248834.png"
            });
        }
    } else {
        alertBox.style.display = 'none';
    }
}

// Inisialisasi awal saat web dimuat
setSapaan();
tampilkanTugas();
cekPengingatBesok();