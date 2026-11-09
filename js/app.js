import { db, ref, set, onValue, remove, update } from "./firebase.js";

const SESSION_KEY = 'uob_peer_review_session_v4';
let globalState = {
    schools: {},
    classes: {},
    reviews: {},
    teachers: {}
};

window.showToast = function(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-semibold animate-fade flex items-center space-x-2 pointer-events-auto ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-sm"></i><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

function initFirebaseSync() {
    onValue(ref(db, 'database/'), (snapshot) => {
        const data = snapshot.val() || {};
        globalState.schools = data.schools || {
            "sch_1": { id: "sch_1", name: "SD Islam Bunga Bangsa Samarinda" },
            "sch_2": { id: "sch_2", name: "SMP Islam Bunga Bangsa Samarinda" },
            "sch_3": { id: "sch_3", name: "SMPN 16 Samarinda" }
        };
        globalState.classes = data.classes || {};
        globalState.reviews = data.reviews || {};
        globalState.teachers = data.teachers || {
            "tch_1": { id: "tch_1", email: "guru@sekolah.edu", name: "Guru Utama", schoolId: "sch_1" }
        };
        renderApp();
    });
}

function getSession() {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
}

window.handleLogout = function() {
    localStorage.removeItem(SESSION_KEY);
    showToast("Berhasil keluar sesi.");
    renderApp();
};

// --- AUTH & LOGIN (Bug Pop-up Fixed) ---
window.loginAsAdmin = function(e) {
    e.preventDefault();
    const pin = document.getElementById('admin-pin').value;
    if (pin === "admin123") {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'admin', name: 'Super Administrator' }));
        closeModal();
        showToast("Login Admin Berhasil!");
        renderApp();
    } else {
        showToast("PIN Admin Salah! Gunakan: admin123", "error");
    }
};

window.loginAsTeacher = function(e) {
    e.preventDefault();
    const email = document.getElementById('teacher-email').value;
    const pass = document.getElementById('teacher-pass').value;
    
    // Cek database pengajar
    const teachersList = Object.values(globalState.teachers);
    const found = teachersList.find(t => t.email === email);

    if (pass === "guru123" && (found || email === "guru@sekolah.edu")) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'teacher', name: email }));
        closeModal();
        showToast(`Selamat datang, ${email}!`);
        renderApp();
    } else {
        showToast("Email atau Password Pengajar Salah! (Pass: guru123)", "error");
    }
};

window.loginAsStudent = function(e, classId) {
    e.preventDefault();
    const codeInput = document.getElementById(`code-${classId}`).value;
    const studentName = document.getElementById(`student-${classId}`).value;
    const cls = globalState.classes[classId];

    if (codeInput !== cls.accessCode) {
        showToast("Kode Akses Kelas Salah!", "error");
        return;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({
        role: 'student',
        name: studentName,
        classId: classId,
        schoolId: cls.schoolId
    }));
    closeModal();
    showToast(`Masuk ke kelas ${cls.className} sebagai ${studentName}`);
    renderApp();
};

// --- RENDER MASTER ---
function renderApp() {
    const session = getSession();
    const container = document.getElementById('app-container');
    const navInfo = document.getElementById('navbar-auth-info');
    const navRole = document.getElementById('nav-role-badge');
    const navName = document.getElementById('nav-user-name');

    if (!session) {
        navInfo.classList.add('hidden');
        container.innerHTML = renderGlobalDashboard();
        return;
    }

    navInfo.classList.remove('hidden');
    navRole.textContent = session.role.toUpperCase();
    navName.textContent = session.name;

    if (session.role === 'admin') {
        container.innerHTML = renderAdminDashboard();
    } else if (session.role === 'teacher') {
        container.innerHTML = renderTeacherDashboard(session.name);
    } else if (session.role === 'student') {
        container.innerHTML = renderStudentDashboard(session);
    }
}

function renderGlobalDashboard() {
    const schools = Object.values(globalState.schools);
    return `
        <div class="space-y-8 animate-fade py-6">
            <div class="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-4">
                <span class="bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">UOB x Ruangguru Lab</span>
                <h2 class="text-3xl font-bold">Peer Review & App Testing Platform</h2>
                <p class="text-indigo-200 text-sm max-w-2xl leading-relaxed">
                    Platform kolaboratif pengujian aplikasi, penilaian UX, iterasi perbaikan, dan showcase hasil karya siswa lintas sekolah.
                </p>
                <div class="flex flex-wrap gap-3 pt-2">
                    <button onclick="openTeacherLoginModal()" class="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-5 py-2.5 rounded-xl shadow transition text-xs flex items-center space-x-2">
                        <i class="fa-solid fa-chalkboard-user"></i><span>Login Pengajar</span>
                    </button>
                    <button onclick="openAdminLoginModal()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl shadow transition text-xs flex items-center space-x-2 border border-slate-700">
                        <i class="fa-solid fa-shield-halved"></i><span>Login Admin</span>
                    </button>
                </div>
            </div>

            <div class="space-y-4">
                <h3 class="font-bold text-slate-800 text-lg">Daftar Sekolah & Kelas</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    ${schools.map(sch => {
                        const schClasses = Object.values(globalState.classes).filter(c => c.schoolId === sch.id);
                        return `
                            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                                <div class="space-y-2">
                                    <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                                        <i class="fa-solid fa-school"></i>
                                    </div>
                                    <h4 class="font-bold text-slate-800 text-base">${sch.name}</h4>
                                    <p class="text-xs text-slate-500">${schClasses.length} Kelas terdaftar</p>
                                </div>
                                <div class="space-y-2 pt-4 border-t border-slate-100">
                                    <p class="text-[11px] font-bold text-slate-400 uppercase">Pilih Kelas untuk Siswa:</p>
                                    ${schClasses.length === 0 ? `<p class="text-xs text-slate-400 italic">Belum ada kelas.</p>` : 
                                      schClasses.map(cls => `
                                        <div onclick="openStudentAccessModal('${cls.id}')" class="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 p-3 rounded-xl cursor-pointer transition flex justify-between items-center text-xs font-semibold text-slate-700 hover:text-indigo-700">
                                            <span><i class="fa-solid fa-people-roof mr-1.5 text-indigo-500"></i>${cls.className}</span>
                                            <i class="fa-solid fa-chevron-right text-[10px]"></i>
                                        </div>
                                      `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

// ADMIN DASHBOARD (Full Management: Sekolah, Kelas, Review, Pengajar)
function renderAdminDashboard() {
    const schools = Object.values(globalState.schools);
    const classes = Object.values(globalState.classes);
    const reviews = Object.values(globalState.reviews);
    const teachers = Object.values(globalState.teachers);

    return `
        <div class="space-y-8 animate-fade pb-12">
            <div class="bg-gradient-to-r from-rose-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3">
                <span class="bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Admin Panel (Full Management)</span>
                <h2 class="text-2xl font-bold">Panel Kontrol Administrator</h2>
                <p class="text-rose-100 text-xs sm:text-sm">Kelola sekolah, kelas, akun pengajar, dan data review secara menyeluruh (Tambah, Edit, Detail, Hapus).</p>
            </div>

            <!-- 1. KELOLA SEKOLAH -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 class="font-bold text-slate-800 text-base">Manajemen Sekolah</h3>
                <form onsubmit="handleAdminAddSchool(event)" class="flex gap-3">
                    <input type="text" id="new-school-name" placeholder="Nama Sekolah Baru..." required class="flex-1 text-xs border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                    <button type="submit" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-xs shadow">Tambah Sekolah</button>
                </form>
                <div class="overflow-x-auto pt-2">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                                <th class="p-3 rounded-l-xl">Nama Sekolah</th>
                                <th class="p-3">ID Sekolah</th>
                                <th class="p-3 rounded-r-xl text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${schools.map(sch => `
                                <tr>
                                    <td class="p-3 font-bold text-slate-800">${sch.name}</td>
                                    <td class="p-3 font-mono text-slate-400">${sch.id}</td>
                                    <td class="p-3 text-right space-x-1">
                                        <button onclick="openEditSchoolModal('${sch.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-semibold">Edit</button>
                                        <button onclick="deleteSchool('${sch.id}')" class="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-semibold">Hapus</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 2. KELOLA AKUN PENGAJAR -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div class="flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 text-base">Manajemen Akun Pengajar</h3>
                    <button onclick="openAddTeacherModal()" class="bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow">+ Tambah Pengajar</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                                <th class="p-3 rounded-l-xl">Nama Pengajar</th>
                                <th class="p-3">Email</th>
                                <th class="p-3">Sekolah Penugasan</th>
                                <th class="p-3 rounded-r-xl text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${teachers.map(tch => {
                                const sch = globalState.schools[tch.schoolId] || { name: 'Belum Ditugaskan' };
                                return `
                                    <tr>
                                        <td class="p-3 font-bold text-slate-800">${tch.name}</td>
                                        <td class="p-3 text-slate-600">${tch.email}</td>
                                        <td class="p-3 text-indigo-600 font-semibold">${sch.name}</td>
                                        <td class="p-3 text-right space-x-1">
                                            <button onclick="openEditTeacherModal('${tch.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-semibold">Edit</button>
                                            <button onclick="deleteTeacher('${tch.id}')" class="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-semibold">Hapus</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 3. KELOLA KELAS / ROMBEL -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 class="font-bold text-slate-800 text-base">Manajemen Kelas & Rombel (${classes.length})</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                                <th class="p-3 rounded-l-xl">Nama Kelas</th>
                                <th class="p-3">Sekolah</th>
                                <th class="p-3">Kode Akses</th>
                                <th class="p-3">Jumlah Siswa</th>
                                <th class="p-3 rounded-r-xl text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${classes.map(cls => {
                                const sch = globalState.schools[cls.schoolId] || { name: '-' };
                                return `
                                    <tr>
                                        <td class="p-3 font-bold text-slate-800">${cls.className}</td>
                                        <td class="p-3 text-slate-600">${sch.name}</td>
                                        <td class="p-3 font-mono font-bold text-indigo-600">${cls.accessCode}</td>
                                        <td class="p-3">${(cls.students || []).length} siswa</td>
                                        <td class="p-3 text-right space-x-1">
                                            <button onclick="openClassDetailModal('${cls.id}')" class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold">Detail</button>
                                            <button onclick="deleteClass('${cls.id}')" class="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-semibold">Hapus</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 4. MONITORING & MANAJEMEN REVIEW -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 class="font-bold text-slate-800 text-base">Monitoring & Manajemen Review (${reviews.length})</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                                <th class="p-3 rounded-l-xl">Aplikasi / Proyek</th>
                                <th class="p-3">Tester & Creator</th>
                                <th class="p-3">Kelas & Sekolah</th>
                                <th class="p-3 rounded-r-xl text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${reviews.map(r => {
                                const cls = globalState.classes[r.classId] || {};
                                const sch = globalState.schools[cls.schoolId] || {};
                                return `
                                    <tr>
                                        <td class="p-3"><strong class="text-slate-800">${r.appName}</strong> (${r.rating}★)</td>
                                        <td class="p-3">${r.tester} &rarr; ${r.creator}</td>
                                        <td class="p-3 text-slate-600">${cls.className || '-'} (${sch.name || '-'})</td>
                                        <td class="p-3 text-right space-x-1">
                                            <button onclick="openReviewDetailModal('${r.id}')" class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold">Detail</button>
                                            <button onclick="deleteReviewItem('${r.id}')" class="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-semibold">Hapus</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderTeacherDashboard(teacherEmail) {
    const schools = Object.values(globalState.schools);
    const classes = Object.values(globalState.classes);
    return `
        <div class="space-y-6 animate-fade pb-12">
            <div class="bg-gradient-to-r from-indigo-800 to-teal-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3">
                <span class="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Teacher Panel</span>
                <h2 class="text-2xl font-bold">Manajemen Kelas & Rekap Siswa</h2>
                <p class="text-indigo-100 text-xs sm:text-sm">Buat kelas baru, tentukan kode akses, dan pantau hasil peer review siswa.</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 class="font-bold text-slate-800 text-base">Buat Kelas / Rombel Baru</h3>
                <form onsubmit="handleTeacherCreateClass(event)" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Pilih Sekolah:</label>
                            <select id="cls-school" required class="w-full border border-slate-200 rounded-xl p-3 bg-white font-medium">
                                <option value="">-- Pilih Sekolah --</option>
                                ${schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Nama Kelas:</label>
                            <input type="text" id="cls-name" placeholder="Contoh: Kelas 8A" required class="w-full border border-slate-200 rounded-xl p-3">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Kode Akses Kelas:</label>
                            <input type="text" id="cls-code" placeholder="Contoh: uob2026" required class="w-full border border-slate-200 rounded-xl p-3 font-mono font-bold text-indigo-600">
                        </div>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Daftar Nama Siswa (Pisahkan koma/baris baru):</label>
                        <textarea id="cls-students" rows="3" placeholder="Adam, Bella, Caca, ..." required class="w-full border border-slate-200 rounded-xl p-3"></textarea>
                    </div>
                    <div class="flex justify-end"><button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow">Simpan Kelas Baru</button></div>
                </form>
            </div>

            <div class="space-y-4">
                <h3 class="font-bold text-slate-800 text-base">Daftar Kelas yang Dikelola</h3>
                ${classes.length === 0 ? `<div class="bg-white p-8 rounded-3xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">Belum ada kelas.</div>` :
                  classes.map(cls => {
                      const students = cls.students || [];
                      return `
                          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                              <div class="flex justify-between items-start border-b pb-3">
                                  <div>
                                      <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Kode Akses: ${cls.accessCode}</span>
                                      <h4 class="font-bold text-slate-800 text-lg mt-1">${cls.className}</h4>
                                  </div>
                                  <button onclick="deleteClass('${cls.id}')" class="text-rose-600 text-xs font-semibold bg-rose-50 px-3 py-1.5 rounded-xl"><i class="fa-solid fa-trash mr-1"></i>Hapus</button>
                              </div>
                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  ${students.map((st, idx) => {
                                      const studentReviews = Object.values(globalState.reviews).filter(r => r.creator === st);
                                      const isDone = studentReviews.length > 0;
                                      return `
                                          <div class="bg-slate-50 p-3 rounded-xl border flex justify-between items-center">
                                              <div>
                                                  <span class="font-bold text-slate-800">${idx+1}. ${st}</span>
                                                  <span class="block text-[10px] ${isDone ? 'text-emerald-600 font-semibold' : 'text-slate-400'}">${isDone ? '✓ Selesai Direview' : 'Belum ada review'}</span>
                                              </div>
                                              ${isDone ? `<button onclick="openTeacherDetailModal('${st}')" class="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold">Lihat Detail</button>` : ''}
                                          </div>
                                      `;
                                  }).join('')}
                              </div>
                          </div>
                      `;
                  }).join('')}
            </div>
        </div>
    `;
}

function renderStudentDashboard(session) {
    const cls = globalState.classes[session.classId];
    if (!cls) return `<div class="p-8 text-center">Kelas tidak ditemukan. <button onclick="handleLogout()" class="text-indigo-600 font-bold underline">Keluar</button></div>`;

    const allReviews = Object.values(globalState.reviews);
    const mySubmissionsAsTester = allReviews.filter(r => r.tester === session.name);
    const mySubmissionsAsCreator = allReviews.filter(r => r.creator === session.name);

    return `
        <div class="space-y-6 animate-fade pb-12">
            <div class="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs flex items-start space-x-3 shadow-sm">
                <i class="fa-solid fa-triangle-exclamation text-amber-600 text-base mt-0.5"></i>
                <div>
                    <strong class="font-bold">Catatan Etika Digital:</strong> Kamu login sebagai <strong>${session.name}</strong> di kelas <em>${cls.className}</em>. Dilarang iseng menggunakan nama teman!
                </div>
            </div>

            <div class="flex gap-2">
                <button onclick="switchStudentTab('tester')" id="tab-btn-tester" class="py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center space-x-2 bg-indigo-600 text-white shadow-md">
                    <i class="fa-solid fa-list-check"></i><span>1. Uji Proyek (Tester)</span>
                </button>
                <button onclick="switchStudentTab('creator')" id="tab-btn-creator" class="py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center space-x-2 bg-slate-100 text-slate-600 hover:bg-slate-200">
                    <i class="fa-solid fa-comments"></i><span>2. Feedback & Iterasi (Creator) <span class="bg-emerald-600 text-white px-1.5 py-0.5 rounded-full text-[10px] ml-1">${mySubmissionsAsCreator.length}</span></span>
                </button>
            </div>

            <!-- TAB 1: TESTER -->
            <div id="student-tab-tester" class="space-y-6">
                <div class="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3">
                    <span class="bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Peran 1: Tester</span>
                    <h2 class="text-2xl font-bold">Uji Coba Proyek Teman (Sesuai Worksheet Sesi 16)</h2>
                    <p class="text-indigo-200 text-xs sm:text-sm leading-relaxed">
                        Lakukan pengujian aplikasi teman secara menyeluruh dari Bagian A hingga E, berikan rating bintang (default 0), dan isi feedback konstruktif.
                    </p>
                    <button onclick="openWorksheetModal('${session.classId}', '${session.name}')" class="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-6 py-3 rounded-2xl shadow-lg transition text-xs flex items-center space-x-2">
                        <i class="fa-solid fa-plus-circle text-lg"></i><span>+ Mulai Worksheet Sesi 16 (Bagian A - E)</span>
                    </button>
                </div>

                <div class="space-y-4">
                    <h3 class="font-bold text-slate-800 text-base">Worksheet Pengujian yang Kamu Kirim (${mySubmissionsAsTester.length})</h3>
                    ${mySubmissionsAsTester.length === 0 ? `<div class="bg-white p-8 rounded-3xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">Belum ada worksheet testing yang diisi.</div>` :
                      mySubmissionsAsTester.map(item => `
                        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-xs">
                            <div class="flex justify-between items-start border-b pb-2">
                                <div><span class="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Aplikasi: ${item.appName}</span><h4 class="font-bold text-slate-800 text-base mt-1">Creator: ${item.creator}</h4></div>
                                <div class="text-amber-400 text-base">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div class="bg-emerald-50 p-3 rounded-xl border"><strong>Pujian:</strong> ${item.praise}</div>
                                <div class="bg-slate-50 p-3 rounded-xl border"><strong>Temuan:</strong> ${item.finding}</div>
                                <div class="bg-sky-50 p-3 rounded-xl border"><strong>Saran:</strong> ${item.suggestion}</div>
                            </div>
                            <div class="flex justify-end"><button onclick="deleteReviewItem('${item.id}')" class="text-rose-600 text-xs font-semibold bg-rose-50 px-3 py-1 rounded-xl">Hapus</button></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- TAB 2: CREATOR -->
            <div id="student-tab-creator" class="hidden space-y-6">
                <div class="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3">
                    <span class="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Peran 2: Creator (Revisi & Showcase Card)</span>
                    <h2 class="text-2xl font-bold">Feedback Masuk & Kartu Showcase</h2>
                    <p class="text-emerald-100 text-xs sm:text-sm">Periksa ulasan tester, lakukan perbaikan (Bagian F-J), dan lihat kartu siap demonstrasi (Bagian H).</p>
                </div>

                <div class="space-y-4">
                    ${mySubmissionsAsCreator.length === 0 ? `<div class="bg-white p-8 rounded-3xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">Belum ada feedback untuk aplikasimu.</div>` :
                      mySubmissionsAsCreator.map(fb => `
                        <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-xs">
                            <div class="flex justify-between items-start border-b pb-3">
                                <div><span class="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">Aplikasi Kamu</span><h4 class="font-bold text-slate-800 text-lg mt-1">${fb.appName}</h4><p class="text-slate-500">Diuji oleh: <strong class="text-indigo-600">${fb.tester}</strong></p></div>
                                <div class="text-amber-400 text-base">${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</div>
                            </div>

                            <div class="bg-slate-50 border p-5 rounded-3xl space-y-4">
                                <h4 class="font-bold text-indigo-700 text-sm"><i class="fa-solid fa-screwdriver-wrench mr-1"></i>Bagian F - J: Revisi & Re-testing</h4>
                                <form onsubmit="saveCreatorIteration(event, '${fb.id}')" class="space-y-4">
                                    <div class="bg-indigo-50 border p-3.5 rounded-2xl">
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" name="is_safe" id="chk-safe-${fb.id}" ${fb.is_safe ? 'checked' : ''} onchange="toggleStudentSafe('${fb.id}')" class="rounded text-indigo-600 w-4 h-4">
                                            <span class="font-bold text-indigo-900">✨ Aplikasi Sudah 100% Aman (Tanpa Perbaikan / Revisi Lagi)</span>
                                        </label>
                                    </div>
                                    <div id="revisi-box-${fb.id}" class="${fb.is_safe ? 'hidden' : 'space-y-3'}">
                                        <div><label class="block font-bold mb-1">Bagian yang diperbaiki:</label><input type="text" name="fixed_part" value="${fb.fixed_part || ''}" placeholder="Contoh: Posisi tombol..." class="w-full border rounded-xl p-3 bg-white"></div>
                                        <div><label class="block font-bold mb-1">Catatan Perbaikan:</label><textarea name="fix_note" rows="2" class="w-full border rounded-xl p-3 bg-white">${fb.fix_note || ''}</textarea></div>
                                    </div>
                                    <div><label class="block font-bold mb-1">Refleksi Akhir:</label><input type="text" name="reflection" value="${fb.reflection || ''}" placeholder="Catatan siap showcase..." required class="w-full border rounded-xl p-3 bg-white"></div>
                                    <div class="flex justify-end"><button type="submit" class="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow">Simpan Hasil Revisi</button></div>
                                </form>
                            </div>

                            <div class="bg-gradient-to-br from-indigo-900 to-slate-800 text-white p-6 rounded-3xl space-y-3 shadow-lg">
                                <div class="flex items-center space-x-2 text-amber-300 font-bold text-sm border-b border-indigo-700 pb-2">
                                    <i class="fa-solid fa-id-card"></i><span>Bagian H: Mini Showcase Card (Panduan Demo 1 Menit)</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div class="bg-indigo-950/60 p-3 rounded-xl border border-indigo-700/50"><strong>Nama Aplikasi:</strong><p class="text-indigo-200 mt-0.5">${fb.appName}</p></div>
                                    <div class="bg-indigo-950/60 p-3 rounded-xl border border-indigo-700/50"><strong>Digunakan Untuk:</strong><p class="text-indigo-200 mt-0.5">${fb.appGoal || 'Simulasi interaktif'}</p></div>
                                    <div class="bg-indigo-950/60 p-3 rounded-xl border border-indigo-700/50"><strong>Feedback Diterima:</strong><p class="text-indigo-200 mt-0.5">${fb.praise} | Temuan: ${fb.finding}</p></div>
                                    <div class="bg-indigo-950/60 p-3 rounded-xl border border-indigo-700/50"><strong>Perbaikan Dilakukan:</strong><p class="text-indigo-200 mt-0.5">${fb.is_safe ? 'Tidak ada (Sudah aman)' : (fb.fixed_part || 'Belum ada perbaikan')}</p></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// --- MODALS & WORKSHEET (LEBAR DIPERLUAS 85% / MAX-W-4XL) ---
window.openTeacherLoginModal = function() {
    showModal(`
        <div class="space-y-4 text-xs">
            <div class="flex justify-between items-center border-b pb-3"><h3 class="font-bold text-base">Login Pengajar</h3><button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button></div>
            <form onsubmit="loginAsTeacher(event)" class="space-y-3">
                <div><label class="block font-bold mb-1">Email Pengajar:</label><input type="email" id="teacher-email" placeholder="Masukkan email pengajar..." required class="w-full border rounded-xl p-3"></div>
                <div><label class="block font-bold mb-1">Password:</label><input type="password" id="teacher-pass" placeholder="Masukkan password..." required class="w-full border rounded-xl p-3"></div>
                <div class="flex justify-end pt-2"><button type="submit" class="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow">Masuk Dashboard</button></div>
            </form>
        </div>
    `, 'max-w-md');
};

window.openAdminLoginModal = function() {
    showModal(`
        <div class="space-y-4 text-xs">
            <div class="flex justify-between items-center border-b pb-3"><h3 class="font-bold text-base">Login Admin</h3><button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button></div>
            <form onsubmit="loginAsAdmin(event)" class="space-y-3">
                <div><label class="block font-bold mb-1">PIN / Password Admin:</label><input type="password" id="admin-pin" placeholder="Masukkan PIN keamanan..." required class="w-full border rounded-xl p-3"></div>
                <div class="flex justify-end pt-2"><button type="submit" class="bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl shadow">Masuk Admin</button></div>
            </form>
        </div>
    `, 'max-w-md');
};

window.openStudentAccessModal = function(classId) {
    const cls = globalState.classes[classId];
    const students = cls.students || [];
    showModal(`
        <div class="space-y-4 text-xs">
            <div class="flex justify-between items-center border-b pb-3">
                <div><span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Akses Kelas</span><h3 class="font-bold text-base mt-1">${cls.className}</h3></div>
                <button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form onsubmit="loginAsStudent(event, '${classId}')" class="space-y-3">
                <div><label class="block font-bold mb-1">Kode Akses Kelas:</label><input type="password" id="code-${classId}" placeholder="Masukkan kode..." required class="w-full border rounded-xl p-3"></div>
                <div><label class="block font-bold mb-1">Pilih Namamu:</label><select id="student-${classId}" required class="w-full border rounded-xl p-3 bg-white font-medium"><option value="">-- Pilih Nama --</option>${students.map(st => `<option value="${st}">${st}</option>`).join('')}</select></div>
                <div class="flex justify-end pt-2"><button type="submit" class="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow">Masuk ke Kelas</button></div>
            </form>
        </div>
    `, 'max-w-md');
};

let currentModalRating = 0;
window.openWorksheetModal = function(classId, studentName) {
    const cls = globalState.classes[classId];
    const otherStudents = (cls.students || []).filter(st => st !== studentName);

    showModal(`
        <div class="space-y-6 text-xs max-h-[85vh] overflow-y-auto pr-2">
            <div class="flex justify-between items-center border-b pb-3">
                <div><span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Sesi 16 Worksheet</span><h3 class="font-bold text-lg mt-1">Mini Showcase & App Testing</h3></div>
                <button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <form id="worksheet-form" onsubmit="submitWorksheetForm(event)" class="space-y-5">
                <div class="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-2 text-indigo-900">
                    <p><strong>Nama Tester (Otomatis):</strong> ${studentName}</p>
                    <p><strong>Tujuan Kegiatan:</strong> Menguji aplikasi teman, menilai UX, memberi feedback konstruktif, dan melakukan iterasi perbaikan.</p>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border space-y-3">
                    <h4 class="font-bold text-slate-800 text-sm">A. Pemanasan: 3 Konsep Penting (Essay Bebas)</h4>
                    <div><label class="block font-semibold mb-1">1. Menurutmu, apa itu Beta Testing?</label><textarea name="p_beta" placeholder="Tuliskan pemahamanmu..." rows="2" required class="w-full border rounded-xl p-2.5 bg-white"></textarea></div>
                    <div><label class="block font-semibold mb-1">2. Menurutmu, apa itu UX (User Experience)?</label><textarea name="p_ux" placeholder="Tuliskan pemahamanmu..." rows="2" required class="w-full border rounded-xl p-2.5 bg-white"></textarea></div>
                    <div><label class="block font-semibold mb-1">3. Menurutmu, apa itu Feedback?</label><textarea name="p_feedback" placeholder="Tuliskan pemahamanmu..." rows="2" required class="w-full border rounded-xl p-2.5 bg-white"></textarea></div>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border space-y-3">
                    <h4 class="font-bold text-slate-800 text-sm">B. Sebelum Testing: Kenali Aplikasinya</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label class="block font-semibold mb-1">Nama Creator:</label><select name="creator" required class="w-full border rounded-xl p-2.5 bg-white font-medium"><option value="">-- Pilih Creator --</option>${otherStudents.map(st => `<option value="${st}">${st}</option>`).join('')}</select></div>
                        <div><label class="block font-semibold mb-1">Nama Aplikasi:</label><input type="text" name="appName" placeholder="Contoh: Kuis Matematika" required class="w-full border rounded-xl p-2.5 bg-white"></div>
                    </div>
                    <div><label class="block font-semibold mb-1">Tujuan Aplikasi:</label><input type="text" name="appGoal" placeholder="Contoh: Belajar hitung cepat anak SD" required class="w-full border rounded-xl p-2.5 bg-white"></div>
                    <div class="bg-white p-3 rounded-xl border flex items-center space-x-2">
                        <input type="checkbox" id="chk-point1" required class="w-4 h-4 text-indigo-600 rounded">
                        <label for="chk-point1" class="font-semibold text-slate-700">Checkpoint 1: Pastikan aplikasi bisa dijalankan di HP/Companion sebelum menilai.</label>
                    </div>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border space-y-3">
                    <h4 class="font-bold text-slate-800 text-sm">C. Beta Testing: Uji Aplikasi Teman (8 Poin)</h4>
                    <div class="space-y-3">
                        ${[
                            "1. Aplikasi dapat dijalankan di HP melalui testing/QR.",
                            "2. Instruksi pada aplikasi mudah dibaca dan dipahami.",
                            "3. Tombol utama terlihat jelas dan mudah digunakan.",
                            "4. Input dapat dimasukkan sesuai kebutuhan aplikasi.",
                            "5. Fitur utama berjalan saat dicoba.",
                            "6. Output/hasil yang muncul sesuai tindakan pengguna.",
                            "7. Alur penggunaan aplikasi tidak membingungkan.",
                            "8. Aplikasi dapat digunakan tanpa error menghambat."
                        ].map((q, i) => `
                            <div class="bg-white p-3 rounded-xl border space-y-2">
                                <p class="font-medium text-slate-700">${q}</p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <select name="test_status_${i+1}" onchange="toggleTestNote(this, 'note-box-${i+1}')" class="border rounded-lg p-2 bg-slate-50 font-semibold text-xs">
                                        <option value="OK">OK (Aman)</option>
                                        <option value="Perlu Diperbaiki">Perlu Diperbaiki</option>
                                    </select>
                                    <input type="text" name="test_note_${i+1}" id="note-box-${i+1}" placeholder="Catatan temuan..." class="border rounded-lg p-2 text-xs hidden">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border space-y-3">
                    <h4 class="font-bold text-slate-800 text-sm">D. Rating UX (Bintang 1 - 5, Default 0)</h4>
                    <div class="flex items-center space-x-3 bg-white p-3 rounded-xl border">
                        <div class="flex space-x-1 text-2xl text-slate-300 cursor-pointer" id="modal-star-box">
                            <i class="fa-solid fa-star" onclick="setModalRating(1)"></i>
                            <i class="fa-solid fa-star" onclick="setModalRating(2)"></i>
                            <i class="fa-solid fa-star" onclick="setModalRating(3)"></i>
                            <i class="fa-solid fa-star" onclick="setModalRating(4)"></i>
                            <i class="fa-solid fa-star" onclick="setModalRating(5)"></i>
                        </div>
                        <span id="modal-star-desc" class="font-bold text-slate-500">0 - Belum dinilai</span>
                        <input type="hidden" name="rating" id="modal-rating-val" value="0" required>
                    </div>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border space-y-3">
                    <h4 class="font-bold text-slate-800 text-sm">E. Feedback untuk Developer</h4>
                    <div class="space-y-3">
                        <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            <label class="block font-bold text-emerald-900 mb-1">Pujian:</label>
                            <input type="text" name="praise" placeholder="Contoh: Menurutku bagian tombol sudah bagus..." required class="w-full border rounded-xl p-2 bg-white">
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border">
                            <label class="block font-bold text-slate-800 mb-1">Temuan:</label>
                            <input type="text" name="finding" placeholder="Contoh: Saat aku mencoba teks dialog terlalu cepat..." required class="w-full border rounded-xl p-2 bg-white">
                        </div>
                        <div class="bg-sky-50 p-3 rounded-xl border border-sky-200">
                            <label class="block font-bold text-sky-900 mb-1">Saran:</label>
                            <input type="text" name="suggestion" placeholder="Contoh: Saran spesifik: tambahkan waktu..." required class="w-full border rounded-xl p-2 bg-white">
                        </div>
                    </div>
                </div>

                <div class="flex justify-end space-x-2 pt-2">
                    <button type="button" onclick="closeModal()" class="px-4 py-2.5 bg-slate-200 rounded-xl font-semibold">Batal</button>
                    <button type="submit" class="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow">Simpan Worksheet Testing</button>
                </div>
            </form>
        </div>
    `, 'max-w-4xl w-[85%]'); // Lebar diperluas 85% / max-w-4xl
    currentModalRating = 0;
}

// --- ADMIN FULL MANAGEMENT MODALS (Tambah/Edit Pengajar & Sekolah) ---
window.openAddTeacherModal = function() {
    const schools = Object.values(globalState.schools);
    showModal(`
        <div class="space-y-4 text-xs">
            <div class="flex justify-between items-center border-b pb-3"><h3 class="font-bold text-base">Tambah Akun Pengajar</h3><button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button></div>
            <form onsubmit="handleAdminSaveTeacher(event)" class="space-y-3">
                <div><label class="block font-bold mb-1">Nama Pengajar:</label><input type="text" name="name" placeholder="Nama Lengkap..." required class="w-full border rounded-xl p-3"></div>
                <div><label class="block font-bold mb-1">Email Pengajar:</label><input type="email" name="email" placeholder="guru@sekolah.edu" required class="w-full border rounded-xl p-3"></div>
                <div>
                    <label class="block font-bold mb-1">Penugasan Sekolah:</label>
                    <select name="schoolId" required class="w-full border rounded-xl p-3 bg-white">
                        <option value="">-- Pilih Sekolah --</option>
                        ${schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>
                <div class="flex justify-end pt-2"><button type="submit" class="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow">Simpan Pengajar</button></div>
            </form>
        </div>
    `, 'max-w-md');
};

window.openEditSchoolModal = function(schId) {
    const sch = globalState.schools[schId];
    showModal(`
        <div class="space-y-4 text-xs">
            <div class="flex justify-between items-center border-b pb-3"><h3 class="font-bold text-base">Edit Sekolah</h3><button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button></div>
            <form onsubmit="handleAdminUpdateSchool(event, '${schId}')" class="space-y-3">
                <div><label class="block font-bold mb-1">Nama Sekolah:</label><input type="text" id="edit-sch-name" value="${sch.name}" required class="w-full border rounded-xl p-3"></div>
                <div class="flex justify-end pt-2"><button type="submit" class="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow">Update Sekolah</button></div>
            </form>
        </div>
    `, 'max-w-md');
};

window.openClassDetailModal = function(classId) {
    const cls = globalState.classes[classId];
    const sch = globalState.schools[cls.schoolId] || {};
    showModal(`
        <div class="space-y-3 text-xs">
            <div class="flex justify-between items-center border-b pb-3"><h3 class="font-bold text-base">Detail Kelas: ${cls.className}</h3><button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button></div>
            <p><strong>Sekolah:</strong> ${sch.name || '-'}</p>
            <p><strong>Kode Akses:</strong> <code class="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">${cls.accessCode}</code></p>
            <p><strong>Daftar Siswa (${(cls.students || []).length}):</strong></p>
            <ul class="list-disc pl-4 space-y-1">${(cls.students || []).map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
    `, 'max-w-md');
};

window.openReviewDetailModal = function(revId) {
    const r = globalState.reviews[revId];
    const cls = globalState.classes[r.classId] || {};
    const sch = globalState.schools[cls.schoolId] || {};
    showModal(`
        <div class="space-y-3 text-xs">
            <div class="flex justify-between items-center border-b pb-3"><h3 class="font-bold text-base">Detail Review: ${r.appName}</h3><button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button></div>
            <p><strong>Sekolah / Kelas:</strong> ${sch.name || '-'} / ${cls.className || '-'}</p>
            <p><strong>Tester:</strong> ${r.tester} | <strong>Creator:</strong> ${r.creator}</p>
            <p><strong>Rating:</strong> ${r.rating}★</p>
            <p><strong>Pujian:</strong> ${r.praise}</p>
            <p><strong>Temuan:</strong> ${r.finding}</p>
            <p><strong>Saran:</strong> ${r.suggestion}</p>
            <p><strong>Status Perbaikan:</strong> ${r.fixed_part || 'Belum'}</p>
        </div>
    `, 'max-w-lg');
};

window.toggleTestNote = function(selectEl, noteId) {
    const noteInput = document.getElementById(noteId);
    if (selectEl.value === 'Perlu Diperbaiki') {
        noteInput.classList.remove('hidden');
        noteInput.setAttribute('required', 'true');
    } else {
        noteInput.classList.add('hidden');
        noteInput.removeAttribute('required');
        noteInput.value = '';
    }
};

window.setModalRating = function(star) {
    currentModalRating = star;
    document.getElementById('modal-rating-val').value = star;
    const desc = { 1: "Sangat perlu diperbaiki", 2: "Kurang", 3: "Cukup baik", 4: "Baik", 5: "Sangat baik" };
    document.getElementById('modal-star-desc').textContent = `${star} - ${desc[star]}`;
    const stars = document.getElementById('modal-star-box').children;
    for (let i = 0; i < stars.length; i++) {
        stars[i].className = i < star ? "fa-solid fa-star text-amber-400" : "fa-solid fa-star text-slate-300";
    }
};

// --- DATABASE HANDLERS ---
window.handleAdminAddSchool = function(e) {
    e.preventDefault();
    const name = document.getElementById('new-school-name').value;
    const schId = 'sch_' + Date.now();
    set(ref(db, `database/schools/${schId}`), { id: schId, name }).then(() => { showToast("Sekolah ditambahkan!"); });
};

window.handleAdminUpdateSchool = function(e, schId) {
    e.preventDefault();
    const name = document.getElementById('edit-sch-name').value;
    update(ref(db, `database/schools/${schId}`), { name }).then(() => { closeModal(); showToast("Sekolah diupdate!"); });
};

window.handleAdminSaveTeacher = function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tchId = 'tch_' + Date.now();
    set(ref(db, `database/teachers/${tchId}`), {
        id: tchId,
        name: fd.get('name'),
        email: fd.get('email'),
        schoolId: fd.get('schoolId')
    }).then(() => { closeModal(); showToast("Pengajar ditambahkan!"); });
};

window.deleteTeacher = function(id) {
    if (!confirm("Hapus pengajar ini?")) return;
    remove(ref(db, `database/teachers/${id}`)).then(() => { showToast("Pengajar dihapus", "error"); });
};

window.handleTeacherCreateClass = function(e) {
    e.preventDefault();
    const schoolId = document.getElementById('cls-school').value;
    const className = document.getElementById('cls-name').value;
    const accessCode = document.getElementById('cls-code').value;
    const students = document.getElementById('cls-students').value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

    const classId = 'cls_' + Date.now();
    set(ref(db, `database/classes/${classId}`), { id: classId, schoolId, className, accessCode, students }).then(() => { showToast("Kelas dibuat!"); });
};

window.submitWorksheetForm = function(e) {
    e.preventDefault();
    const session = getSession();
    const fd = new FormData(document.getElementById('worksheet-form'));
    const revId = 'rev_' + Date.now();

    const newRev = {
        id: revId,
        classId: session.classId,
        tester: session.name,
        creator: fd.get('creator'),
        appName: fd.get('appName'),
        appGoal: fd.get('appGoal'),
        rating: parseInt(fd.get('rating')),
        praise: fd.get('praise'),
        finding: fd.get('finding'),
        suggestion: fd.get('suggestion'),
        is_safe: false,
        fixed_part: '',
        fix_note: '',
        reflection: ''
    };

    set(ref(db, `database/reviews/${revId}`), newRev).then(() => {
        closeModal();
        showToast("Worksheet testing tersimpan!");
    });
};

window.saveCreatorIteration = function(e, revId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const target = globalState.reviews[revId];
    if (target) {
        target.is_safe = fd.get('is_safe') === 'on';
        target.fixed_part = target.is_safe ? 'Aman (Tanpa perbaikan)' : fd.get('fixed_part');
        target.fix_note = target.is_safe ? 'Stabil' : fd.get('fix_note');
        target.reflection = fd.get('reflection');

        update(ref(db, `database/reviews/${revId}`), target).then(() => {
            showToast("Hasil revisi disimpan!");
        });
    }
};

window.toggleStudentSafe = function(id) {
    const isChecked = document.getElementById(`chk-safe-${id}`).checked;
    const box = document.getElementById(`revisi-box-${id}`);
    if (isChecked) box.classList.add('hidden');
    else box.classList.remove('hidden');
};

window.deleteReviewItem = function(id) {
    if (!confirm("Hapus worksheet?")) return;
    remove(ref(db, `database/reviews/${id}`)).then(() => { showToast("Dihapus", "error"); });
};

window.deleteClass = function(id) {
    if (!confirm("Hapus kelas?")) return;
    remove(ref(db, `database/classes/${id}`)).then(() => { showToast("Dihapus", "error"); });
};

window.deleteSchool = function(id) {
    if (!confirm("Hapus sekolah?")) return;
    remove(ref(db, `database/schools/${id}`)).then(() => { showToast("Dihapus", "error"); });
};

window.switchStudentTab = function(tab) {
    const testerDiv = document.getElementById('student-tab-tester');
    const creatorDiv = document.getElementById('student-tab-creator');
    const btnTester = document.getElementById('tab-btn-tester');
    const btnCreator = document.getElementById('tab-btn-creator');

    if (tab === 'tester') {
        testerDiv.classList.remove('hidden');
        creatorDiv.classList.add('hidden');
        btnTester.className = "py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center space-x-2 bg-indigo-600 text-white shadow-md";
        btnCreator.className = "py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center space-x-2 bg-slate-100 text-slate-600 hover:bg-slate-200";
    } else {
        testerDiv.classList.add('hidden');
        creatorDiv.classList.remove('hidden');
        btnCreator.className = "py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center space-x-2 bg-indigo-600 text-white shadow-md";
        btnTester.className = "py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center space-x-2 bg-slate-100 text-slate-600 hover:bg-slate-200";
    }
};

function showModal(html, sizeClass = 'max-w-xl') {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto';
    overlay.innerHTML = `<div class="bg-white rounded-3xl shadow-2xl ${sizeClass} w-full p-6 sm:p-8 animate-fade">${html}</div>`;
    document.body.appendChild(overlay);
}

window.closeModal = function() {
    const el = document.getElementById('modal-overlay');
    if (el) el.remove();
};

window.openTeacherDetailModal = function(studentName) {
    const reviews = Object.values(globalState.reviews).filter(r => r.creator === studentName);
    showModal(`
        <div class="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-2">
            <div class="flex justify-between items-center border-b pb-3"><h3 class="font-bold text-base">Detail Rekap: ${studentName}</h3><button onclick="closeModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button></div>
            ${reviews.map(r => `
                <div class="bg-slate-50 p-4 rounded-2xl border space-y-2">
                    <p><strong>Aplikasi:</strong> ${r.appName} (Tester: ${r.tester}, Rating: ${r.rating}★)</p>
                    <p><strong>Pujian:</strong> ${r.praise}</p>
                    <p><strong>Temuan:</strong> ${r.finding}</p>
                    <p><strong>Status Revisi:</strong> ${r.fixed_part || 'Belum'}</p>
                    <p><strong>Refleksi:</strong> ${r.reflection || '-'}</p>
                </div>
            `).join('')}
        </div>
    `, 'max-w-lg');
};

window.onload = function() {
    initFirebaseSync();
};
