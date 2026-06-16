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
    fetchTasksForRole
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
            alert("⚠️ Vui lòng chỉ chọn tối đa 10 ảnh!");
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

        if (files.length > 10) return alert("Chỉ được tải lên tối đa 10 ảnh!");

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
            
            alert("✅ Đã gửi báo cáo thành công! Chờ quản lý duyệt.");
            e.target.reset();
            previewContainer.innerHTML = '';
        } catch (err) {
            alert("❌ Gửi thất bại: " + err.message);
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
            alert("✅ Đã phát lệnh giao việc thành công!");
            e.target.reset();
            loadAdminTasks(); // Load lại danh sách vừa tạo
        } catch (err) {
            alert("❌ Lỗi: " + err.message);
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
    listContainer.innerHTML = '<div class="text-center text-gray-500 py-8 col-span-2">⏳ Đang tải dữ liệu báo cáo...</div>';

    try {
        let reports = await fetchAllWorkReports();
        
        // Lọc theo Doanh mục (Role)
        if (window.currentReportFilter !== 'all') {
            reports = reports.filter(r => (r.authorRole || 'member') === window.currentReportFilter);
        }
        
        window.allLoadedReports = reports; // Lưu vào biến toàn cục để Modal đọc
        
        if (reports.length === 0) {
            listContainer.innerHTML = `<div class="glass-panel p-6 text-center text-gray-500 rounded-xl col-span-2 border border-dashed border-white/10">Không có báo cáo nào thuộc bộ phận này.</div>`;
            return;
        }

        // Render ra các "Thẻ Rút Gọn" (Chỉ hiện Tên, Tiến độ, Trạng thái)
        listContainer.innerHTML = reports.map(r => {
            const isApproved = r.status === 'approved';
            const statusColor = isApproved ? 'text-green-400 border-green-500/50 bg-green-500/10' : 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
            const statusText = isApproved ? '✅ Đã Duyệt' : '⏳ Chờ Duyệt';
            const dateStr = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
            const roleBadge = r.authorRole ? `<span class="px-2 py-0.5 rounded bg-purple-900/50 border border-purple-500/50 text-purple-300 text-[10px] uppercase font-bold ml-2">${r.authorRole}</span>` : '';
            
            return `
                <div onclick="window.viewReportDetail('${r.id}')" class="glass-panel p-5 rounded-2xl border-l-4 ${isApproved ? 'border-green-500' : 'border-yellow-500'} cursor-pointer hover:bg-white/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-black text-white text-base flex items-center">${r.author} ${roleBadge}</h4>
                            <span class="text-[10px] text-gray-500 font-mono">${dateStr}</span>
                        </div>
                        <span class="px-2 py-1 rounded-full text-[9px] font-bold uppercase border ${statusColor} whitespace-nowrap ml-2">${statusText}</span>
                    </div>
                    
                    <div class="mb-4 text-white text-sm line-clamp-2">${r.task}</div>
                    
                    <div class="flex items-center gap-3">
                        <div class="flex-1 bg-black/50 rounded-full h-2 border border-white/10 overflow-hidden">
                            <div class="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full" style="width: ${r.percent}%"></div>
                        </div>
                        <span class="text-xs font-bold text-cyan-400 w-10 text-right">${r.percent}%</span>
                    </div>
                    
                    <div class="mt-4 pt-3 border-t border-white/5 text-right">
                        <span class="text-xs text-cyan-400 font-bold group-hover:text-cyan-300 group-hover:underline transition flex items-center justify-end gap-1">Bấm xem chi tiết ➔</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        listContainer.innerHTML = `<div class="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/30 col-span-2">Lỗi tải báo cáo: ${e.message}</div>`;
    }
}

// ----------------------------------------------------
// Hàm mở Modal và Đổ dữ liệu chi tiết của 1 Báo cáo
// ----------------------------------------------------
window.viewReportDetail = (id) => {
    // Tìm báo cáo từ biến toàn cục
    const r = window.allLoadedReports.find(x => x.id === id);
    if (!r) return;

    const modal = document.getElementById('report-detail-modal');
    const content = document.getElementById('report-detail-content');

    const isApproved = r.status === 'approved';
    const dateStr = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
    
    // BẢO MẬT: Chặn không cho Staff thấy nút duyệt (Chỉ Admin và Dev)
    const canApprove = !isApproved && ['admin', 'dev'].includes(currentRole);

    // Xử lý Gallery Ảnh
    let imagesHtml = '';
    if (r.images && r.images.length > 0) {
        imagesHtml = `
            <div class="mb-6 pt-5 border-t border-white/10">
                <p class="text-sm text-cyan-400 mb-4 uppercase font-bold tracking-wider flex items-center gap-2">📸 Ảnh minh chứng (${r.images.length})</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    ${r.images.map(img => `<a href="${img}" target="_blank" class="block overflow-hidden rounded-xl border border-white/10 hover:border-cyan-400 transition shadow-md"><img src="${img}" class="w-full h-32 object-cover hover:scale-110 transition duration-500"></a>`).join('')}
                </div>
            </div>
        `;
    }

    // Xử lý Link đính kèm
    let linkHtml = '';
    if (r.link) {
        linkHtml = `
            <div class="mb-6 pt-5 border-t border-white/10">
                <p class="text-sm text-cyan-400 mb-3 uppercase font-bold tracking-wider flex items-center gap-2">🔗 Tệp đính kèm / Kết quả</p>
                <a href="${r.link}" target="_blank" class="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white transition bg-blue-600/20 hover:bg-blue-600/40 px-5 py-3 rounded-xl border border-blue-500/30 w-full break-all shadow-inner">
                    <span class="text-lg">🌐</span> ${r.link}
                </a>
            </div>
        `;
    }

    // Đổ toàn bộ HTML vào Modal
    content.innerHTML = `
        <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-purple-600 p-[2px]">
                    <div class="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-2xl">👤</div>
                </div>
                <div>
                    <h4 class="font-black text-white text-xl uppercase tracking-wide">${r.author} 
                        <span class="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-500/50 px-2 py-0.5 rounded align-middle ml-2">${r.authorRole || 'MEMBER'}</span>
                    </h4>
                    <span class="text-xs text-gray-400 font-mono inline-block mt-1">Đã nộp lúc: ${dateStr}</span>
                </div>
            </div>
            <span class="px-3 py-1.5 rounded-full text-xs font-bold uppercase border shadow-sm ${isApproved ? 'text-green-400 border-green-500/50 bg-green-500/10' : 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10'}">${isApproved ? '✅ Đã Duyệt' : '⏳ Chờ Duyệt'}</span>
        </div>
        
        <div class="mb-6 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
            <p class="text-cyan-400 font-bold mb-2 text-xs uppercase tracking-widest flex items-center gap-2">📝 Chi tiết Nhiệm vụ</p>
            <p class="text-white text-lg leading-relaxed">${r.task}</p>
        </div>
        
        <div class="mb-6 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
            <div class="flex justify-between items-end mb-2">
                <p class="text-cyan-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">📊 Tiến độ hoàn thành</p>
                <span class="text-white font-black text-xl">${r.percent}%</span>
            </div>
            <div class="w-full bg-gray-900 rounded-full h-4 border border-white/10 overflow-hidden shadow-inner">
                <div class="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 relative" style="width: ${r.percent}%">
                    <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
            </div>
        </div>
        
        ${imagesHtml}
        ${linkHtml}

        ${canApprove ? `
            <div class="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button onclick="window.approveReportAction('${r.id}')" class="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white px-8 py-3 rounded-xl text-sm font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all transform hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center gap-2">
                    <span class="text-lg">✅</span> CHẤP NHẬN & DUYỆT BÁO CÁO
                </button>
            </div>
        ` : ''}
    `;

    // Hiển thị Modal
    modal.classList.remove('hidden');
};

// Hàm xử lý khi Admin bấm Duyệt
window.approveReportAction = async (docId) => {
    if (confirm("Xác nhận duyệt báo cáo công việc này?")) {
        try {
            await editDocument("work_reports", docId, { status: "approved" });
            alert("Đã duyệt báo cáo thành công!");
            document.getElementById('report-detail-modal').classList.add('hidden'); // Ẩn Modal
            loadWorkReports(); // Tải lại danh sách Card
        } catch (e) { alert("Lỗi khi duyệt: " + e.message); }
    }
};

// Cấp quyền gọi hàm duyệt báo cáo ra global
window.approveReportAction = async (docId) => {
    if (confirm("Xác nhận duyệt báo cáo công việc này?")) {
        try {
            await editDocument("work_reports", docId, { status: "approved" });
            alert("Đã duyệt báo cáo thành công!");
            loadWorkReports(); // Tải lại danh sách
        } catch (e) { alert("Lỗi khi duyệt: " + e.message); }
    }
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
                    <input type="number" id="pay-amount" min="1000" class="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white outline-none focus:border-cyan-500" placeholder="VD: 50000" required>
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

            if (!targetUid) return alert("Vui lòng chọn 1 nhân sự!");
            if (!confirm(`Bạn chắc chắn muốn chuyển ${Number(amount).toLocaleString('vi-VN')} Coin với lý do: "${reason}"?`)) return;

            btn.innerText = "⏳ ĐANG XỬ LÝ GIAO DỊCH...";
            btn.disabled = true;

            try {
                await createPayrollEntry(targetUid, amount, reason);
                alert("✅ Giao dịch thành công! Dữ liệu đã được cập nhật vào ví của nhân sự.");
                e.target.reset();
            } catch (err) { alert("❌ Lỗi giao dịch: " + err.message); } 
            finally {
                btn.innerText = "PHÁT LƯƠNG & GỬI THÔNG BÁO 🚀";
                btn.disabled = false;
            }
        });

    } catch (e) {
        panel.innerHTML = `<div class="text-red-500 p-4">Lỗi tải form quản lý: ${e.message}</div>`;
    }
}