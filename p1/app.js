// Daftarkan Service Worker untuk mode Offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('Service Worker terdaftar untuk mode Offline!');
        });
    });
}

// Minta izin Notifikasi Pop-up dari Android
if ("Notification" in window) {
    Notification.requestPermission();
}

let daftarPR = JSON.parse(localStorage.getItem('dataPR')) || [];

function simpanTugas() {
    const mapel = document.getElementById('mapel').value;
    const tanggal = document.getElementById('tanggal').value;
    const kelompok = document.getElementById('kelompok').value;

    if(!mapel || !tanggal) {
        alert("Mapel dan Tanggal wajib diisi!");
        return;
    }

    const tugas = { id: Date.now(), mapel, tanggal, kelompok };
    daftarPR.push(tugas);
    localStorage.setItem('dataPR', JSON.stringify(daftarPR));
    
    document.getElementById('mapel').value = '';
    document.getElementById('tanggal').value = '';
    document.getElementById('kelompok').value = '';
    
    tampilkanTugas();
    cekPengingatBesok();
}

function hapusTugas(id) {
    daftarPR = daftarPR.filter(tugas => tugas.id !== id);
    localStorage.setItem('dataPR', JSON.stringify(daftarPR));
    tampilkanTugas();
    cekPengingatBesok();
}

function tampilkanTugas() {
    const list = document.getElementById('daftarTugas');
    list.innerHTML = '';
    
    daftarPR.forEach(tugas => {
        let infoKelompok = tugas.kelompok ? `<br><small>Kelompok: ${tugas.kelompok}</small>` : '';
        list.innerHTML += `
            <li style="margin-bottom:10px;">
                <strong>${tugas.mapel}</strong> (Tenggat: ${tugas.tanggal}) 
                ${infoKelompok}
                <button onclick="hapusTugas(${tugas.id})" style="width:auto; padding:5px; background:red; margin-left:10px;">Selesai</button>
            </li>`;
    });
}

function cekPengingatBesok() {
    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    const tglBesokStr = besok.toISOString().split('T')[0];

    const prBesok = daftarPR.filter(tugas => tugas.tanggal === tglBesokStr);
    const alertBox = document.getElementById('reminderAlert');
    const listBesok = document.getElementById('besokList');
    
    if (prBesok.length > 0) {
        alertBox.style.display = 'block';
        listBesok.innerHTML = '';
        
        let pesanNotif = "Tugas yang harus dikumpulkan besok:\n";
        
        prBesok.forEach(tugas => {
            let infoKel = tugas.kelompok ? ` (Bawa grup: ${tugas.kelompok})` : '';
            listBesok.innerHTML += `<li>${tugas.mapel} ${infoKel}</li>`;
            pesanNotif += `- ${tugas.mapel} ${infoKel}\n`;
        });

        // Tampilkan Pop-up Notifikasi Sistem Android
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

tampilkanTugas();
cekPengingatBesok();
