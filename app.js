// =================================================================
// KODE FRONTEND APPS.JS - PORTAL BUDGET & PELAPORAN SMCC 2027 (FULL REFACTOR)
// =================================================================

const API_URL = "https://script.google.com/macros/s/AKfycbx9l_42zS_hfs9pqZloy6m2tgKVnoc0Yny51v45yRpQB_u6CjUrYNUk7sAWHeotjTbs/exec";

// Variabel Global
let appData = {
  userProfile: null,
  budgets: [],
  openItems: []
};

let currentUserEmail = localStorage.getItem('smcc_user_email') || '';
let currentBudgetFilter = 'ALL';

// Galeri Pilihan Avatar
const LOCAL_AVATAR_GALLERY = [
  { name: 'Avatar 01', path: 'Avatar/Avatar-01.svg' },
  { name: 'Avatar 02', path: 'Avatar/Avatar-02.svg' },
  { name: 'Avatar 03', path: 'Avatar/Avatar-03.svg' },
  { name: 'Avatar 04', path: 'Avatar/Avatar-04.svg' },
  { name: 'Avatar 05', path: 'Avatar/Avatar-05.svg' },
  { name: 'Avatar 06', path: 'Avatar/Avatar-06.svg' }
];
let regSelectedAvatar = 'Avatar/Avatar-02.svg';

// ==========================================
// 1. INIT & UTILITY 
// ==========================================
window.onload = function() {
  const path = window.location.pathname;
  if (path.includes('dashboard.html') || path.includes('dokumen.html')) {
    if (!currentUserEmail) {
      window.location.href = 'index.html';
      return;
    }
    loadDashboardData();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('docKelengkapanPIC')) {
    initUserPIC();
  }
  if (document.getElementById('docNamaAnggaran')) {
    populateBudgetDropdown();
  }
});

function showLoading(text) {
  const el = document.getElementById('loadingText');
  if (el) el.innerText = text;
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function formatRp(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function buildAvatarHTML(avatarCode, nama, isLarge) {
  const sizeClass = isLarge ? 'rounded-circle shadow-sm border border-2 border-warning' : 'rounded-circle';
  const dimension = isLarge ? '64px' : '40px';
  if (avatarCode && (avatarCode.startsWith('Avatar/') || avatarCode.startsWith('data:image'))) {
    return `<img src="${avatarCode}" alt="${nama}" width="${dimension}" height="${dimension}" class="${sizeClass}" style="object-fit: cover;">`;
  }
  const initial = nama ? nama.charAt(0).toUpperCase() : 'U';
  return `<div class="bg-primary text-white d-flex align-items-center justify-content-center fw-bold ${sizeClass}" style="width: ${dimension}; height: ${dimension}; font-size: ${isLarge ? '1.5rem' : '1rem'};">${initial}</div>`;
}

// ==========================================
// 2. MODUL LOGIN & REGISTRASI WIZARD
// ==========================================
async function submitEmailLogin() {
  const emailInput = document.getElementById('inputUserEmail');
  if (!emailInput) return;
  
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    alert('Silakan masukkan email kantor terlebih dahulu.');
    return;
  }

  showLoading('Memverifikasi email ke database...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${API_URL}?action=verifyUser&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const result = await res.json();
    hideLoading();

    if (result && result.success && result.userProfile) {
      const profile = result.userProfile;
      currentUserEmail = email;
      localStorage.setItem('smcc_user_email', email);
      localStorage.setItem('currentUserName', profile.nama || '');

      if (profile.isNewUser) {
        document.getElementById('emailLoginBox').style.display = 'none';
        document.getElementById('formRegisterNew').style.display = 'block';
        document.getElementById('detectedEmailText').innerText = email;
        renderLoginAvatarGallery();
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      alert('Gagal memverifikasi: Respons server tidak valid.');
    }
  } catch (err) {
    hideLoading();
    if (err.name === 'AbortError') {
      alert('Koneksi ke server timeout. Periksa koneksi atau URL Apps Script.');
    } else {
      alert('Gagal terhubung ke server: ' + err.message);
    }
  }
}

function nextWizardSlide(slideIndex) {
  const track = document.getElementById('wizardTrack');
  if (track) {
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
  }
  updateWizardDots(slideIndex);
}

function prevWizardSlide(slideIndex) {
  const track = document.getElementById('wizardTrack');
  if (track) {
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
  }
  updateWizardDots(slideIndex);
}

function updateWizardDots(activeIndex) {
  document.querySelectorAll('.step-dot').forEach((dot, index) => {
    if (index === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function renderLoginAvatarGallery() {
  const container = document.getElementById('loginAvatarGalleryGrid');
  if (!container) return;
  
  container.innerHTML = '';
  LOCAL_AVATAR_GALLERY.forEach((av) => {
    const isSelected = av.path === regSelectedAvatar ? 'border-primary border-3 shadow' : 'border-light';
    container.innerHTML += `
      <div class="d-inline-block p-1 m-1 cursor-pointer" onclick="selectLoginAvatar('${av.path}')">
        <img src="${av.path}" width="48" height="48" class="rounded-circle border ${isSelected}" style="object-fit: cover; cursor: pointer;">
      </div>`;
  });
  document.getElementById('regAvatarSelected').value = regSelectedAvatar;
}

function selectLoginAvatar(path) {
  regSelectedAvatar = path;
  renderLoginAvatarGallery();
}

async function handleWizardSubmit(event) {
  event.preventDefault();
  await submitNewRegistration();
}

async function submitNewRegistration() {
  const nama = document.getElementById('regNama').value.trim();
  const role = document.getElementById('regRole').value.trim();
  const whatsapp = document.getElementById('regWa').value.trim();
  const bio = document.getElementById('regBio').value.trim();
  const avatar = document.getElementById('regAvatarSelected').value || regSelectedAvatar;

  if (!nama || !whatsapp) {
    alert('Harap isi Nama Lengkap dan Nomor WhatsApp.');
    return;
  }

  showLoading('Menyimpan data registrasi...');

  try {
    const payload = {
      action: 'registerUser',
      email: currentUserEmail,
      nama: nama,
      role: role,
      whatsapp: whatsapp,
      avatar: avatar,
      bio: bio
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    hideLoading();

    if (result && result.success) {
      localStorage.setItem('currentUserName', nama);
      alert('Registrasi berhasil! Selamat datang di Portal SMCC.');
      window.location.href = 'dashboard.html';
    } else {
      alert('Gagal registrasi: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    hideLoading();
    alert('Gagal mengirim data registrasi: ' + err.message);
  }
}

// ==========================================
// 3. MODUL DASHBOARD & TABEL BUDGET
// ==========================================
async function loadDashboardData() {
  showLoading('Mengambil data dari Apps Script API...');
  try {
    const url = `${API_URL}?action=getData&email=${encodeURIComponent(currentUserEmail)}`;
    const res = await fetch(url);
    const dataMain = await res.json();
    hideLoading();

    if (!dataMain || !dataMain.success) {
      alert('Gagal memuat data dari server.');
      return;
    }
    appData = dataMain;

    const p = dataMain.userProfile || {};
    if (p.nama) {
      localStorage.setItem('currentUserName', p.nama);
    }
    const userNameEl = document.getElementById('sidebarUserName');
    if (userNameEl) userNameEl.innerText = p.nama || 'User';
    
    const userRoleEl = document.getElementById('sidebarUserRole');
    if (userRoleEl) userRoleEl.innerText = p.role || 'Staff';
    
    const avatarContainer = document.getElementById('sidebarAvatarContainer');
    if (avatarContainer) {
      avatarContainer.innerHTML = buildAvatarHTML(p.avatar, p.nama, false);
    }

    renderFilteredBudgetTable();
    populateBudgetDropdown();
  } catch (err) {
    hideLoading();
    alert('Gagal memuat data dashboard: ' + err.message);
  }
}

function toggleBudgetSubmenu() {
  const subMenu = document.getElementById('budgetSubmenu');
  const arrow = document.getElementById('submenuArrow');
  if (subMenu) {
    if (subMenu.style.display === 'none' || subMenu.classList.contains('d-none')) {
      subMenu.style.display = 'block';
      subMenu.classList.remove('d-none');
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
      subMenu.style.display = 'none';
      if (arrow) arrow.style.transform = 'rotate(-90deg)';
    }
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('portalSidebar');
  const wrapper = document.querySelector('.portal-wrapper');
  
  if (sidebar) {
    if (window.innerWidth >= 992) {
      sidebar.classList.toggle('sidebar-collapsed');
      if (wrapper) wrapper.classList.toggle('sidebar-full');
    } else {
      sidebar.classList.toggle('show-sidebar');
    }
  }
}

function filterBudgetCategory(category) {
  currentBudgetFilter = category; 
  document.querySelectorAll('.sidebar-sublink').forEach(el => el.classList.remove('active'));
  if (category === 'ALL') document.getElementById('sub-all')?.classList.add('active');
  if (category === 'SM') document.getElementById('sub-sm')?.classList.add('active');
  if (category === 'CORCOMM') document.getElementById('sub-corcomm')?.classList.add('active');
  renderFilteredBudgetTable();
}

function renderDashboardMetrics(budgets) {
  let totalPagu = 0, totalTerpakai = 0, totalSisa = 0;
  if (budgets && budgets.length > 0) {
    budgets.forEach(b => {
      let p = b.pagu ?? b.Pagu ?? 0;
      let t = b.terpakai ?? b.Terpakai ?? 0;
      let s = b.sisa ?? b.Sisa ?? 0;

      if (typeof p === 'string') p = Number(p.replace(/[^0-9.-]+/g, "")) || 0;
      if (typeof t === 'string') t = Number(t.replace(/[^0-9.-]+/g, "")) || 0;
      if (typeof s === 'string') s = Number(s.replace(/[^0-9.-]+/g, "")) || 0;

      totalPagu += Number(p) || 0;
      totalTerpakai += Number(t) || 0;
      totalSisa += Number(s) || 0;
    });
  }

  const persentase = totalPagu > 0 ? ((totalTerpakai / totalPagu) * 100).toFixed(1) : 0;
  
  if (document.getElementById('kpiTotalPagu')) document.getElementById('kpiTotalPagu').innerText = formatRp(totalPagu);
  if (document.getElementById('kpiTotalTerpakai')) document.getElementById('kpiTotalTerpakai').innerText = formatRp(totalTerpakai);
  if (document.getElementById('kpiTotalSisa')) document.getElementById('kpiTotalSisa').innerText = formatRp(totalSisa);
  if (document.getElementById('kpiPersenSerapan')) document.getElementById('kpiPersenSerapan').innerText = persentase + '%';
}

function renderFilteredBudgetTable() {
  const tbody = document.getElementById('budgetTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  let totPagu = 0, totTerpakai = 0, totSisa = 0;
  
  let filteredBudgets = (appData.budgets || []).filter(b => {
    const nama = (b.Nama_Anggaran || b.namaAnggaran || b.nama_anggaran || '').toUpperCase();
    if (currentBudgetFilter === 'SM') return nama.includes('CSR');
    if (currentBudgetFilter === 'CORCOMM') return nama.includes('PMC') || nama.includes('ADP');
    return true; 
  });

  if (filteredBudgets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Tidak ada data anggaran untuk kategori ini.</td></tr>';
    renderDashboardMetrics([]);
    return;
  }

  filteredBudgets.forEach(b => {
    let namaAnggaranVal = b.Nama_Anggaran || b.namaAnggaran || b.nama_anggaran || '-';
    let activityVal = b.Activity_Description || b.activityDesc || b.activity_description || b.activity || '-';
    let rincianVal = b.Rincian_Activity || b.rincianAct || b.rincian_activity || b.rincian || '-';
    
    let p = Number(b.pagu || b.Pagu || 0);
    let t = Number(b.terpakai || b.Terpakai || 0);
    let s = Number(b.sisa || b.Sisa || 0);
    totPagu += p; totTerpakai += t; totSisa += s;
    
    const badgeClass = s < 0 ? 'bg-danger' : 'bg-success';
    
    tbody.innerHTML += `
      <tr>
        <td class="fw-bold">${namaAnggaranVal}</td>
        <td>${activityVal}</td>
        <td>${rincianVal}</td>
        <td class="text-end">${formatRp(p)}</td>
        <td class="text-end">${formatRp(t)}</td>
        <td class="text-end">${formatRp(s)}</td>
        <td class="text-center"><span class="badge ${badgeClass}">${b.status || b.Status || 'TERSISA'}</span></td>
      </tr>`;
  });

  renderDashboardMetrics(filteredBudgets);
  
  const tfoot = document.getElementById('budgetTableFoot');
  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="3" class="text-end">TOTAL KESELURUHAN:</td>
        <td class="text-end">${formatRp(totPagu)}</td>
        <td class="text-end">${formatRp(totTerpakai)}</td>
        <td class="text-end">${formatRp(totSisa)}</td>
        <td></td>
      </tr>`;
  }
}

function logoutUser() {
  localStorage.removeItem('smcc_user_email');
  localStorage.removeItem('currentUserName');
  window.location.href = 'index.html';
}

// ==========================================
// 4. MODUL SMART SCAN BERKAS & KAMERA
// ==========================================
let mediaStream = null;

async function startDocumentCamera() {
  const videoElement = document.getElementById('cameraVideo');
  const cameraContainer = document.getElementById('cameraContainer');
  const btnCapture = document.getElementById('btnCapture');
  const btnClose = document.getElementById('btnCloseCamera');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Maaf, peramban (browser) Anda tidak mendukung akses kamera.');
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    videoElement.srcObject = mediaStream;
    cameraContainer.style.display = 'block';
    btnCapture.style.display = 'inline-block';
    btnClose.style.display = 'inline-block';
  } catch (err) {
    console.error('Gagal mengakses kamera:', err);
    alert('Gagal membuka kamera. Pastikan Anda telah memberikan izin akses kamera pada browser.');
  }
}

function captureDocumentPhoto() {
  const videoElement = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const resultContainer = document.getElementById('scanResultContainer');
  const previewImg = document.getElementById('scannedImagePreview');
  const inputBase64 = document.getElementById('scannedImageBase64');

  if (!videoElement.srcObject) return;

  canvas.width = videoElement.videoWidth || 1280;
  canvas.height = videoElement.videoHeight || 720;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL('image/jpeg', 0.85);

  previewImg.src = dataURL;
  inputBase64.value = dataURL;
  resultContainer.style.display = 'block';

  stopDocumentCamera();
}

function stopDocumentCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  const cameraContainer = document.getElementById('cameraContainer');
  const btnCapture = document.getElementById('btnCapture');
  const btnClose = document.getElementById('btnCloseCamera');

  if (cameraContainer) cameraContainer.style.display = 'none';
  if (btnCapture) btnCapture.style.display = 'none';
  if (btnClose) btnClose.style.display = 'none';
}

function retakeDocumentPhoto() {
  document.getElementById('scanResultContainer').style.display = 'none';
  document.getElementById('scannedImageBase64').value = '';
  startDocumentCamera();
}

// ==========================================
// 5. MODUL INPUT DOKUMEN & DROPDOWN SATU JALUR (MASTER BUDGET)
// ==========================================
async function populateBudgetDropdown() {
  const select = document.getElementById('docNamaAnggaran');
  if (!select) return;

  select.innerHTML = '<option value="">Memuat data anggaran...</option>';

  if (!appData.budgets || appData.budgets.length === 0) {
    try {
      const url = `${API_URL}?action=getData&email=${encodeURIComponent(currentUserEmail)}`;
      const res = await fetch(url);
      const dataMain = await res.json();
      if (dataMain && dataMain.success) {
        appData = dataMain;
      }
    } catch (err) {
      console.error('Gagal mengambil data master budget:', err);
    }
  }

  select.innerHTML = '<option value="">Pilih Anggaran...</option>';

  if (appData.budgets && appData.budgets.length > 0) {
    const uniqueMap = new Map();
    
    appData.budgets.forEach(b => {
      const nama = b.Nama_Anggaran || b.namaAnggaran || b.nama_anggaran || '';
      const activity = b.Activity_Description || b.activityDesc || '';
      if (nama && !uniqueMap.has(nama)) {
        const label = activity ? `${nama} - ${activity}` : nama;
        uniqueMap.set(nama, label);
      }
    });

    uniqueMap.forEach((label, nama) => {
      select.innerHTML += `<option value="${nama}">${label}</option>`;
    });

    select.removeEventListener('change', handleMasterBudgetChange);
    select.addEventListener('change', handleMasterBudgetChange);
  } else {
    select.innerHTML = '<option value="">(Gagal memuat data anggaran)</option>';
  }
}

// Fungsi Satu Jalur: Mengambil rincian tepat dari baris Master_Budget yang sama
function handleMasterBudgetChange() {
  const selectedNama = (this.value || '').trim().toLowerCase();
  const rincianSelect = document.getElementById('docRincianActivity');
  
  if (!rincianSelect) return;

  // Reset dropdown rincian
  rincianSelect.innerHTML = '<option value="">Pilih Rincian Aktivitas...</option>';

  if (!selectedNama || !appData.budgets || appData.budgets.length === 0) return;

  // Filter baris yang Nama_Anggaran-nya sama persis dengan yang dipilih
  const matchedRows = appData.budgets.filter(b => {
    const namaSheet = (b.Nama_Anggaran || b.namaAnggaran || b.nama_anggaran || '').trim().toLowerCase();
    return namaSheet === selectedNama;
  });

  console.log("Anggaran dipilih:", selectedNama, "Rincian ditemukan:", matchedRows.length);

  // Masukkan setiap teks Rincian_Activity ke dalam elemen option dropdown
  matchedRows.forEach(b => {
    const rincian = b.Rincian_Activity || b.rincianAct || b.rincian_activity || '';
    if (rincian) {
      rincianSelect.innerHTML += `<option value="${rincian}">${rincian}</option>`;
    }
  });
}

function initUserPIC() {
  const picInput = document.getElementById('docKelengkapanPIC');
  if (picInput) {
    const activeName = localStorage.getItem('currentUserName') || currentUserEmail || 'Staff';
    picInput.value = activeName;
  }
}

function generateDocumentNumber(type) {
  const noInput = document.getElementById('docNomorDokumen');
  if (!type || !noInput) return;

  const now = new Date();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  let randomSeq = Math.floor(Math.random() * 90 + 10);
  let formattedSeq = String(randomSeq).padStart(3, '0');

  let generatedNo = `${formattedSeq}/${type}/SM.CC/${currentMonth.toUpperCase()}/${currentYear}`;
  noInput.value = generatedNo;
}

function handleFileFromFolder(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64String = e.target.result;
    
    const previewImg = document.getElementById('scannedImagePreview');
    const inputBase64 = document.getElementById('scannedImageBase64');
    const resultContainer = document.getElementById('scanResultContainer');
    const fileInfoText = document.getElementById('fileInfoText');

    if (file.type.includes('image')) {
      previewImg.src = base64String;
    } else {
      previewImg.src = 'Avatar/doc-icon.svg';
    }

    inputBase64.value = base64String;
    fileInfoText.innerText = `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    resultContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function removeAttachedFile() {
  document.getElementById('scanResultContainer').style.display = 'none';
  document.getElementById('scannedImageBase64').value = '';
  document.getElementById('uploadFileFolder').value = '';
}

async function handleLogAnggaranSubmit(event) {
  event.preventDefault();

  const jenisDokumen = document.getElementById('docJenisDokumen').value;
  const nomorDokumen = document.getElementById('docNomorDokumen').value;
  const namaAnggaran = document.getElementById('docNamaAnggaran').value;
  const periodeBulan = document.getElementById('docPeriodeBulan').value;
  const namaKegiatan = document.getElementById('docNamaKegiatan').value;
  const nominalRealisasi = document.getElementById('docNominalRealisasi').value;
  const rincianActivity = document.getElementById('docRincianActivity').value;
  const kelengkapanPIC = document.getElementById('docKelengkapanPIC').value;
  const keterangan = document.getElementById('docKeterangan').value || '-';
  const fileBase64 = document.getElementById('scannedImageBase64').value;

  let activityDescription = '';
  if (appData.budgets && appData.budgets.length > 0) {
    const matched = appData.budgets.find(b => {
      const nama = b.Nama_Anggaran || b.namaAnggaran || b.nama_anggaran || '';
      const rincian = b.Rincian_Activity || b.rincianAct || b.rincian_activity || '';
      return nama.trim().toLowerCase() === namaAnggaran.trim().toLowerCase() && 
             rincian.trim().toLowerCase() === rincianActivity.trim().toLowerCase();
    });
    if (matched) {
      activityDescription = matched.Activity_Description || matched.activityDesc || matched.activity_description || '';
    }
  }

  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  if (loadingText) loadingText.innerText = "Menyimpan data ke Google Sheets...";
  if (overlay) overlay.style.display = 'flex';

  try {
    const payload = {
      action: 'saveLogAnggaran',
      email: currentUserEmail,
      jenisDokumen: jenisDokumen,
      nomorDokumen: nomorDokumen,
      namaAnggaran: namaAnggaran,
      activityDescription: activityDescription,
      periodeBulan: periodeBulan,
      namaKegiatan: namaKegiatan,
      nominalRealisasi: nominalRealisasi,
      rincianActivity: rincianActivity,
      kelengkapanPIC: kelengkapanPIC,
      keterangan: keterangan,
      fileBase64: fileBase64
    };

    // Ubah fetch menjadi seperti ini (tanpa mode: 'no-cors')
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Gunakan text/plain agar terhindar dari preflight CORS
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    hideLoading();

    if (result && result.success) {
      alert('Berhasil! Data log anggaran telah dikirim ke Google Sheets.');
      document.getElementById('formInputLogAnggaran').reset();
      initUserPIC();
      document.getElementById('scanResultContainer').style.display = 'none';
      document.getElementById('scannedImageBase64').value = '';
    } else {
      alert('Gagal menyimpan: ' + (result.error || 'Unknown error'));
    }

  } catch (err) {
    hideLoading();
    console.error('Error saat menyimpan:', err);
    alert('Terjadi kesalahan jaringan ke server: ' + err.message);
}
}

async function loadArsipSMCCData() {
  const tbody = document.getElementById('arsipTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Memuat data arsip...</td></tr>';

  try {
    const url = `${API_URL}?action=getArsipData&email=${encodeURIComponent(currentUserEmail)}`;
    const res = await fetch(url);
    const result = await res.json();

    if (result && result.success) {
      const dataArsip = result.data || [];
      document.getElementById('totalArsipCount').innerText = `${dataArsip.length} Dokumen`;
      
      if (dataArsip.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada arsip dokumen tersimpan.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      dataArsip.forEach(item => {
        const badgeStatus = item.status === 'PENDING' ? 'bg-warning text-dark' : (item.status === 'APPROVED' ? 'bg-success' : 'bg-danger');
        const pdfLinkBtn = item.linkPdf ? `<a href="${item.linkPdf}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-pdf"></i> Lihat PDF</a>` : `<span class="text-muted small">Tidak ada file</span>`;

        tbody.innerHTML += `
          <tr>
            <td>
              <div class="fw-bold text-dark">${item.idTransaksi}</div>
              <small class="text-muted">${new Date(item.timestamp).toLocaleDateString('id-ID')}</small>
            </td>
            <td>
              <span class="badge bg-dark">${item.jenisDokumen}</span>
              <div class="small fw-semibold mt-1">${item.nomorDokumen}</div>
            </td>
            <td>
              <div class="fw-bold text-primary">${item.namaKegiatan}</div>
              <small class="text-muted">${item.namaAnggaran} (${item.rincianActivity})</small>
            </td>
            <td class="fw-bold text-end">Rp ${Number(item.nominalRealisasi).toLocaleString('id-ID')}</td>
            <td>${item.pic}</td>
            <td><span class="badge ${badgeStatus}">${item.status}</span></td>
            <td class="text-center">${pdfLinkBtn}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-outline-danger" onclick="hapusArsipDokumen(${item.rowIndex}, '${item.nomorDokumen}')" title="Hapus / Batalkan Dokumen">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>`;
      });
    }
  } catch (err) {
    console.error('Gagal memuat arsip:', err);
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Gagal memuat data arsip dari server.</td></tr>';
  }
}

async function hapusArsipDokumen(rowIndex, nomorDokumen) {
  if (!confirm(`Apakah Anda yakin ingin menghapus/membatalkan dokumen nomor: ${nomorDokumen}? Tindakan ini akan tercatat di Log Aktivitas.`)) {
    return;
  }

  showLoading('Menghapus arsip dokumen...');
  try {
    const payload = {
      action: 'deleteArsip',
      rowIndex: rowIndex,
      email: currentUserEmail
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    hideLoading();

    if (result && result.success) {
      alert('Dokumen berhasil dihapus dan aktivitas telah dicatat.');
      loadArsipSMCCData(); // Muat ulang tabel arsip
    } else {
      alert('Gagal menghapus dokumen: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    hideLoading();
    alert('Terjadi kesalahan jaringan: ' + err.message);
  }
}