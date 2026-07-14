// ==========================================
// 1. IMPORT CÁC HÀM TỪ CORE.JS
// ==========================================
import { 
    subscribeToAuth, 
    submitWorkReport, 
    fetchAllWorkReports, 
    fetchMyPayroll, 
    createPayrollEntry, 
    fetchAllUsers, 
    editDocument,
    uploadImage,
    assignTask,
    fetchTasksForRole,
    showCustomModal,
    getFirebaseErrorMessage
} from './core.js';

let currentUser = null;
let currentRole = 'guest';

// Biến lưu trạng thái Bộ lọc đang chọn ở Tab Duyệt Báo cáo
window.currentReportFilter = 'all';

// ==========================================
// 2. KHỞI TẠO DASHBOARD
// ==========================================
window.addEventListener('load', () => {
    subscribeToAuth((user, role) => {
        if (!user) {
            window.location.href = '/';
            return;
        }
        
        currentUser = user;
        currentRole = role;
        
        setupRoleBasedUI();
        loadWallet();
        loadMyTasks(); // Load việc cần làm của nhân sự
    });

    setupTabs();
    setupReportForm();
    setupAssignTaskForm();
});

// ==========================================
// 3. PHÂN QUYỀN GIAO DIỆN (UI)
// ==========================================
function setupRoleBasedUI() {
    const managerTools = document.getElementById('manager-tools');
    const adminPayrollBtn = document.getElementById('admin-payroll-btn');

    if (['staff', 'admin', 'dev'].includes(currentRole)) {
        if (managerTools) managerTools.classList.remove('hidden');
    }

    if (['admin', 'dev'].includes(currentRole)) {
        if (adminPayrollBtn) adminPayrollBtn.classList.remove('hidden');
    }
}

// ==========================================
// 4. XỬ LÝ CHUYỂN TAB
// ==========================================
function setupTabs() {
    const buttons = document.querySelectorAll('.sidebar-link');
    const contents = document.querySelectorAll('.tab-content');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(l => l.classList.remove('active', 'bg-white/5'));
            e.currentTarget.classList.add('active');
            contents.forEach(tab => tab.classList.add('hidden'));

            const tabId = e.currentTarget.getAttribute('data-tab');
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) targetTab.classList.remove('hidden');

            if (tabId === 'wallet') loadWallet();
            if (tabId === 'manage-work') loadWorkReports();
            if (tabId === 'payroll') loadPayrollAdmin();
            if (tabId === 'assign-task') loadAdminTasks();
        });
    });
}

// ==========================================
// 5. CHỨC NĂNG: VÍ & THU NHẬP
// ==========================================
async function loadWallet() {
    if (!currentUser) return;
    const tbody = document.getElementById('payroll-history-body');
    const notifList = document.getElementById('notification-list');
    const totalEarnedEl = document.getElementById('total-earned');
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Đang tải dữ liệu...</td></tr>';

    try {
        const payrolls = await fetchMyPayroll(currentUser.uid);
        let total = 0;
        tbody.innerHTML = '';
        notifList.innerHTML = '';

        if (payrolls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Chưa có giao dịch nào</td></tr>';
            notifList.innerHTML = '<p class="text-gray-600 text-xs italic">Không có thông báo mới.</p>';
            totalEarnedEl.innerText = '0 Coin';
            return;
        }

        payrolls.forEach(p => {
            const amount = Number(p.amount) || 0;
            total += amount;
            const dateStr = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Đang cập nhật';

            tbody.innerHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5 transition">
                    <td class="p-4 text-gray-400">${dateStr}</td>
                    <td class="p-4 text-white">${p.reason}</td>
                    <td class="p-4 text-right font-bold text-green-400">+${amount.toLocaleString('vi-VN')} Coin</td>
                </tr>
            `;

            notifList.innerHTML += `
                <div class="bg-gradient-to-r from-green-500/10 to-transparent p-4 rounded-xl border border-green-500/20 shadow-sm">
                    <p class="text-xs text-gray-400 mb-1">${dateStr}</p>
                    <p class="text-sm text-white">💰 Bạn vừa nhận được <span class="text-green-400 font-bold">${amount.toLocaleString('vi-VN')} Coin</span></p>
                    <p class="text-xs text-gray-500 mt-1">Lý do: ${p.reason}</p>
                </div>
            `;
        });
        totalEarnedEl.innerText = `${total.toLocaleString('vi-VN')} Coin`;

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Lỗi kết nối máy chủ!</td></tr>`;
    }
}

// ==========================================
// 6A. HIỂN THỊ VIỆC CẦN LÀM (Cho nhân sự)
// ==========================================
async function loadMyTasks() {
    const list = document.getElementById('my-tasks-list');
    if (!list) return;

    try {
        const tasks = await fetchTasksForRole(currentRole);
        
        if (tasks.length === 0) {
            list.innerHTML = '<div class="glass-panel p-4 text-center text-gray-500 text-sm rounded-xl">Hiện chưa có nhiệm vụ nào được giao.</div>';
            return;
        }

        list.innerHTML = tasks.map(t => `
            <div class="glass-panel p-4 rounded-xl border-l-4 border-cyan-500 hover:bg-white/5 transition cursor-pointer group" onclick="document.getElementById('report-task').value = '${t.title}'">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-white group-hover:text-cyan-300 transition">${t.title}</h4>
                    <span class="text-[10px] bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 uppercase">${t.targetRole === 'all' ? 'Chung' : t.targetRole}</span>
                </div>
                <p class="text-xs text-gray-400 line-clamp-2 mb-3">${t.description || 'Không có mô tả chi tiết'}</p>
                <div class="flex justify-between items-center border-t border-white/5 pt-2">
                    <span class="text-[10px] text-gray-500">Giao bởi: ${t.assigner}</span>
                    <span class="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">BÁO CÁO NGAY ➔</span>
                </div>
            </div>
        `).join('');

    } catch (e) {
        list.innerHTML = `<div class="text-red-500 text-sm">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}

// ==========================================
// 6B. CHỨC NĂNG: GỬI BÁO CÁO CÔNG VIỆC (Có Úp Ảnh)
// ==========================================
function setupReportForm() {
    const form = document.getElementById('work-report-form');
    const imageInput = document.getElementById('report-images');
    const previewContainer = document.getElementById('report-image-preview');
    if (!form) return;

    // Hiển thị trước ảnh khi chọn file
    imageInput.addEventListener('change', () => {
        previewContainer.innerHTML = '';
        const files = Array.from(imageInput.files);
        
        if (files.length > 10) {
            showCustomModal("LỖI", "⚠️ Vui lòng chỉ chọn tối đa 10 ảnh!", "danger");
            imageInput.value = ''; 
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML += `<img src="${e.target.result}" class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-cyan-500/50 shadow-md">`;
            };
            reader.readAsDataURL(file);
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const task = document.getElementById('report-task').value.trim();
        const percent = document.getElementById('report-percent').value;
        const link = document.getElementById('report-link').value.trim();
        const files = Array.from(imageInput.files);
        const btn = e.target.querySelector('button');

        if (files.length > 10) return showCustomModal("LỖI", "Chỉ được tải lên tối đa 10 ảnh!", "danger");

        btn.innerText = "⏳ ĐANG TẢI ẢNH VÀ GỬI BÁO CÁO...";
        btn.disabled = true;

        try {
            let imageUrls = [];
            // Upload lần lượt các ảnh lên ImgBB
            if (files.length > 0) {
                for (const file of files) {
                    const url = await uploadImage(file);
                    imageUrls.push(url);
                }
            }

            await submitWorkReport({ 
                task, 
                percent: Number(percent), 
                link,
                images: imageUrls 
            });
            
            showCustomModal("THÀNH CÔNG", "Đã gửi báo cáo thành công! Chờ quản lý duyệt.", "info");
            e.target.reset();
            previewContainer.innerHTML = '';
        } catch (err) {
            showCustomModal("LỖI", "❌ Gửi thất bại: " + getFirebaseErrorMessage(err), "danger");
        } finally {
            btn.innerText = "GỬI BÁO CÁO 🚀";
            btn.disabled = false;
        }
    });
}

// ==========================================
// 7A. CHỨC NĂNG GIAO VIỆC (Cho Admin/Manager)
// ==========================================
function setupAssignTaskForm() {
    const form = document.getElementById('assign-task-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetRole = document.getElementById('task-role').value;
        const title = document.getElementById('task-title').value.trim();
        const desc = document.getElementById('task-desc').value.trim();
        const btn = e.target.querySelector('button');

        btn.innerText = "⏳ ĐANG XỬ LÝ...";
        btn.disabled = true;
        try {
            await assignTask(title, desc, targetRole);
            showCustomModal("THÀNH CÔNG", "Đã phát lệnh giao việc thành công!", "info");
            e.target.reset();
            loadAdminTasks(); // Load lại danh sách vừa tạo
        } catch (err) {
            showCustomModal("LỖI", "❌ Lỗi: " + getFirebaseErrorMessage(err), "danger");
        } finally {
            btn.innerText = "PHÁT LỆNH GIAO VIỆC 🎯";
            btn.disabled = false;
        }
    });
}

// Load danh sách task Admin đã tạo
async function loadAdminTasks() {
    const list = document.getElementById('admin-tasks-list');
    if (!list) return;
    try {
        const tasks = await fetchTasksForRole(currentRole); 
        if (tasks.length === 0) {
            list.innerHTML = '<div class="glass-panel p-4 text-gray-500 italic rounded-xl text-center">Chưa có nhiệm vụ nào.</div>';
            return;
        }

        list.innerHTML = tasks.map(t => `
            <div class="bg-black/30 p-4 rounded-xl border border-white/5">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-cyan-300 text-sm">${t.title}</h4>
                    <span class="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase">${t.targetRole === 'all' ? 'Tất cả' : t.targetRole}</span>
                </div>
                <p class="text-xs text-gray-400 line-clamp-1">${t.description || '...'}</p>
                <div class="text-[9px] text-gray-500 mt-2">Ngày giao: ${new Date(t.createdAt?.seconds * 1000).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = 'Lỗi tải danh sách.'; }
}

// ==========================================
// 7B. DUYỆT BÁO CÁO CÓ LỌC DOANH MỤC (Cho Manager)
// ==========================================
// Hàm gắn vào window để gọi từ HTML
window.filterReports = (roleFilter) => {
    window.currentReportFilter = roleFilter;
    
    // Cập nhật UI nút bấm
    document.querySelectorAll('.report-filter-btn').forEach(btn => {
        btn.className = "report-filter-btn px-4 py-2 rounded-md text-sm font-bold text-gray-400 hover:text-white transition whitespace-nowrap";
    });
    
    const activeBtn = document.getElementById(`filter-${roleFilter}`);
    if (activeBtn) activeBtn.className = "report-filter-btn px-4 py-2 rounded-md text-sm font-bold bg-cyan-600 text-white shadow-md transition whitespace-nowrap";
    
    // Tải lại dữ liệu báo cáo
    loadWorkReports();
};

// ==========================================
// 7B. DUYỆT BÁO CÁO CÓ LỌC DOANH MỤC (Cho Manager/Admin)
// ==========================================
window.currentReportFilter = 'all';
window.allLoadedReports = []; // Biến lưu tạm danh sách để Modal gọi ra xem

window.filterReports = (roleFilter) => {
    window.currentReportFilter = roleFilter;
    
    // Cập nhật UI nút bấm
    document.querySelectorAll('.report-filter-btn').forEach(btn => {
        btn.className = "report-filter-btn px-4 py-2 rounded-md text-sm font-bold text-gray-400 hover:text-white transition whitespace-nowrap";
    });
    
    const activeBtn = document.getElementById(`filter-${roleFilter}`);
    if (activeBtn) activeBtn.className = "report-filter-btn px-4 py-2 rounded-md text-sm font-bold bg-cyan-600 text-white shadow-md transition whitespace-nowrap";
    
    loadWorkReports(); // Tải lại dữ liệu
};

async function loadWorkReports() {
    const listContainer = document.getElementById('all-reports-list');
    listContainer.innerHTML = '<div class="text-center text-gray-500 py-8 col-span-2 title-font text-xl animate-pulse">⏳ Đang tải dữ liệu báo cáo...</div>';

    try {
        let reports = await fetchAllWorkReports();
        
        // 🟢 TẢI DANH SÁCH USER ĐỂ LẤY AVATAR MỚI NHẤT TỪ WEB
        const users = await fetchAllUsers();
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u.photoURL || `https://mc-heads.net/avatar/${u.username}`;
        });

        if (window.currentReportFilter !== 'all') {
            reports = reports.filter(r => (r.authorRole || 'member') === window.currentReportFilter);
        }
        
        // 🟢 GÁN AVATAR ĐỘNG VÀO BIẾN TOÀN CỤC ĐỂ MODAL ĐỌC ĐƯỢC
        window.allLoadedReports = reports.map(r => ({
            ...r,
            avatar: userMap[r.uid] || r.avatar || `https://mc-heads.net/avatar/${r.author}`
        })); 
        
        if (window.allLoadedReports.length === 0) {
            listContainer.innerHTML = `<div class="glass-panel p-8 text-center text-gray-500 italic rounded-2xl col-span-2 md:col-span-3 border border-dashed border-gray-700">Không có báo cáo nào thuộc bộ phận này.</div>`;
            return;
        }

        listContainer.innerHTML = `
            <div class="col-span-1 md:col-span-2 lg:col-span-3 mb-2">
                <span class="text-cyan-400 font-bold text-sm bg-cyan-900/20 px-4 py-2 rounded-lg border border-cyan-500/30 inline-block shadow-sm">
                    📊 Tổng số: <span class="text-white">${window.allLoadedReports.length}</span> báo cáo
                </span>
            </div>
        ` + window.allLoadedReports.map(r => {
            const isApproved = r.status === 'approved';
            const statusColor = isApproved ? 'text-green-400 border-green-500/50 bg-green-500/10' : 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
            const statusText = isApproved ? '✅ Đã Duyệt' : '⏳ Chờ Duyệt';
            
            const dateStr = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
            const roleBadge = r.authorRole ? `<span class="px-2 py-0.5 rounded bg-purple-900/50 border border-purple-500/50 text-purple-300 text-[10px] uppercase font-bold ml-2">${r.authorRole}</span>` : '';
            
            return `
                <div onclick="window.viewReportDetail('${r.id}')" class="glass-panel p-6 rounded-2xl border-l-4 ${isApproved ? 'border-green-500' : 'border-yellow-500'} cursor-pointer hover:bg-white/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute -right-5 -top-5 w-24 h-24 ${isApproved ? 'bg-green-500/10' : 'bg-yellow-500/10'} rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div class="relative z-10 flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <img src="${r.avatar}" class="w-10 h-10 rounded-lg border border-cyan-500/30 object-cover bg-gray-900 shrink-0 shadow-sm">
                            <div>
                                <h4 class="font-black text-white text-lg title-font tracking-wide flex items-center">${r.author} ${roleBadge}</h4>
                                <span class="text-[11px] text-cyan-300 font-mono drop-shadow-md mt-0.5 inline-block">📅 Ngày nộp: ${dateStr}</span>
                            </div>
                        </div>
                        <span class="px-2 py-1 rounded text-[9px] font-bold uppercase border ${statusColor} whitespace-nowrap ml-2 drop-shadow-md">${statusText}</span>
                    </div>
                    
                    <div class="relative z-10 mb-5 text-gray-300 text-sm line-clamp-2 leading-relaxed">${r.task}</div>
                    
                    <div class="relative z-10 flex items-center gap-3">
                        <div class="flex-1 bg-black/60 rounded-full h-2.5 border border-white/10 overflow-hidden shadow-inner">
                            <div class="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full" style="width: ${r.percent}%"></div>
                        </div>
                        <span class="text-xs font-bold text-cyan-400 w-10 text-right drop-shadow-md">${r.percent}%</span>
                    </div>
                    
                    <div class="relative z-10 mt-5 pt-3 border-t border-white/5 text-right">
                        <span class="text-xs text-cyan-400 font-bold group-hover:text-cyan-300 group-hover:underline transition flex items-center justify-end gap-1 uppercase tracking-wider">Xem chi tiết ➔</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        listContainer.innerHTML = `<div class="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/30 col-span-2">Lỗi tải báo cáo: ${e.message}</div>`;
    }
}

window.viewReportDetail = (id) => {
    const r = window.allLoadedReports.find(x => x.id === id);
    if (!r) return;

    const modal = document.getElementById('report-detail-modal');
    const content = document.getElementById('report-detail-content');

    const isApproved = r.status === 'approved';
    const dateStr = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    const canApprove = !isApproved && currentRole === 'admin';

    // 🟢 TẠO LINK LẤY AVATAR TỪ TÊN NHÂN VẬT (r.author)
    const avatarUrl = r.avatar || `https://mc-heads.net/avatar/${r.author}`;

    let imagesHtml = '';
    if (r.images && r.images.length > 0) {
        imagesHtml = `
            <div class="mb-6 pt-5 border-t border-cyan-500/20">
                <p class="text-sm text-cyan-400 mb-4 uppercase font-bold tracking-wider title-font flex items-center gap-2">📸 Ảnh minh chứng (${r.images.length})</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    ${r.images.map(img => `<a href="${img}" target="_blank" class="block overflow-hidden rounded-xl border border-white/10 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all"><img src="${img}" class="w-full h-32 object-cover hover:scale-110 transition duration-500"></a>`).join('')}
                </div>
            </div>
        `;
    }

    let linkHtml = '';
    if (r.link) {
        linkHtml = `
            <div class="mb-6 pt-5 border-t border-cyan-500/20">
                <p class="text-sm text-cyan-400 mb-3 uppercase font-bold tracking-wider title-font flex items-center gap-2">🔗 Tệp đính kèm / Kết quả</p>
                <a href="${r.link}" target="_blank" class="inline-flex items-center gap-3 text-sm text-purple-300 hover:text-white transition bg-purple-900/20 hover:bg-purple-900/40 px-5 py-3 rounded-xl border border-purple-500/30 w-full break-all shadow-inner group">
                    <span class="text-xl group-hover:scale-110 transition">🌐</span> ${r.link}
                </a>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-tr from-cyan-600 to-purple-600 p-[2px] shadow-[0_0_15px_rgba(139,92,246,0.4)] shrink-0">
                    <img src="${avatarUrl}" alt="${r.author}" class="w-full h-full bg-gray-900 rounded-lg object-cover">
                </div>
                <div>
                    <h4 class="font-black text-white text-2xl title-font uppercase tracking-wide drop-shadow-md">${r.author} 
                        <span class="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-500/50 px-2 py-0.5 rounded align-middle ml-2 font-sans">${r.authorRole || 'MEMBER'}</span>
                    </h4>
                    <span class="text-xs text-gray-400 font-mono inline-block mt-1">Đã nộp lúc: ${dateStr}</span>
                </div>
            </div>
            <span class="px-3 py-1.5 rounded text-xs font-bold uppercase border shadow-md ${isApproved ? 'text-green-400 border-green-500/50 bg-green-500/10' : 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10'}">${isApproved ? '✅ Đã Duyệt' : '⏳ Chờ Duyệt'}</span>
        </div>
        
        <div class="mb-6 bg-black/50 p-6 rounded-2xl border border-cyan-500/20 shadow-inner">
            <p class="text-cyan-400 font-bold mb-3 text-sm uppercase tracking-widest title-font flex items-center gap-2">📝 Chi tiết Nhiệm vụ</p>
            <p class="text-gray-200 text-lg leading-relaxed">${r.task}</p>
        </div>
        
        <div class="mb-6 bg-black/50 p-6 rounded-2xl border border-cyan-500/20 shadow-inner">
            <div class="flex justify-between items-end mb-3">
                <p class="text-cyan-400 font-bold text-sm uppercase tracking-widest title-font flex items-center gap-2">📊 Tiến độ hoàn thành</p>
                <span class="text-cyan-400 font-black text-2xl drop-shadow-md">${r.percent}%</span>
            </div>
            <div class="w-full bg-gray-900 rounded-full h-5 border border-white/10 overflow-hidden shadow-inner">
                <div class="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 relative" style="width: ${r.percent}%">
                    <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
            </div>
        </div>
        
        ${imagesHtml}
        ${linkHtml}

        ${canApprove ? `
            <div class="mt-8 pt-6 border-t border-cyan-500/30 flex justify-end">
                <button onclick="window.approveReportAction('${r.id}')" class="cyber-btn text-white px-8 py-4 rounded-xl text-lg title-font font-black w-full sm:w-auto flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    <span class="text-2xl drop-shadow-md">✅</span> CHẤP NHẬN BÁO CÁO
                </button>
            </div>
        ` : ''}
    `;

    modal.classList.add('active'); 
};

// Hàm xử lý khi Admin bấm Duyệt
window.approveReportAction = async (docId) => {
    showCustomModal("XÁC NHẬN", "Duyệt báo cáo công việc này?", "confirm", async () => {
        try {
            await editDocument("work_reports", docId, { status: "approved" });
            showCustomModal("THÀNH CÔNG", "Đã duyệt báo cáo thành công!", "info");
            document.getElementById('report-detail-modal').classList.remove('active');
            loadWorkReports(); // Tải lại danh sách
        } catch (e) { 
            showCustomModal("LỖI", "Lỗi khi duyệt: " + getFirebaseErrorMessage(e), "danger"); 
        }
    });
};

// ==========================================
// 8. CHỨC NĂNG: QUẢN LÝ LƯƠNG & THƯỞNG (ADMIN)
// ==========================================
async function loadPayrollAdmin() {
    const panel = document.getElementById('payroll-admin-panel');
    panel.innerHTML = '<div class="text-center text-gray-500 py-8">⏳ Đang tải dữ liệu nhân sự...</div>';

    try {
        const users = await fetchAllUsers();
        const staffUsers = users.filter(u => ['admin', 'dev', 'staff', 'media', 'helper'].includes(u.role));
        
        const optionsHtml = staffUsers.map(u => 
            `<option value="${u.id}" class="bg-gray-900 text-white">${u.username} - [${u.role.toUpperCase()}]</option>`
        ).join('');

        panel.innerHTML = `
            <form id="payroll-form" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold mb-2 uppercase text-cyan-400">👤 Chọn Nhân Sự Nhận Thưởng</label>
                    <select id="pay-uid" class="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white outline-none focus:border-cyan-500" required>
                        <option value="" disabled selected>-- Vui lòng chọn nhân sự --</option>
                        ${optionsHtml}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold mb-2 uppercase text-cyan-400">💸 Số Tiền (Coin)</label>
                    <input type="number" id="pay-amount" min="0" class="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white outline-none focus:border-cyan-500" placeholder="VD: 50000" required>
                </div>
                <div>
                    <label class="block text-xs font-bold mb-2 uppercase text-cyan-400">📝 Lý do phát lương / thưởng</label>
                    <input type="text" id="pay-reason" class="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white outline-none focus:border-cyan-500" placeholder="VD: Thưởng quay Video Trailer" required>
                </div>
                <button type="submit" class="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black w-full py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all">
                    PHÁT LƯƠNG & GỬI THÔNG BÁO 🚀
                </button>
            </form>
        `;

        document.getElementById('payroll-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const targetUid = document.getElementById('pay-uid').value;
            const amount = document.getElementById('pay-amount').value;
            const reason = document.getElementById('pay-reason').value.trim();
            const btn = e.target.querySelector('button');

            if (!targetUid) return showCustomModal("LỖI", "Vui lòng chọn 1 nhân sự!", "danger");
            if (!confirm(`Bạn chắc chắn muốn chuyển ${Number(amount).toLocaleString('vi-VN')} Coin với lý do: "${reason}"?`)) return;

            btn.innerText = "⏳ ĐANG XỬ LÝ GIAO DỊCH...";
            btn.disabled = true;

            try {
                await createPayrollEntry(targetUid, amount, reason);
                showCustomModal("THÀNH CÔNG", "Giao dịch thành công! Dữ liệu đã được cập nhật vào ví của nhân sự.", "info");
                e.target.reset();
            } catch (err) { showCustomModal("LỖI", "❌ Lỗi giao dịch: " + getFirebaseErrorMessage(err), "danger"); }
            finally {
                btn.innerText = "PHÁT LƯƠNG & GỬI THÔNG BÁO 🚀";
                btn.disabled = false;
            }
        });

    } catch (e) {
        panel.innerHTML = `<div class="text-red-500 p-4">Lỗi tải form quản lý: ${e.message}</div>`;
    }
}