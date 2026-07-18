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
    getFirebaseErrorMessage,
    clockIn,
    clockOut,
    fetchCurrentTimeLog,
    fetchAllTimeLogs,
    fetchMyWorkReports,
    rejectWorkReport,
    editWorkReportUser,
    createWithdrawRequest,
    fetchMyWithdraws,
    fetchAllWithdraws,
    updateWithdrawStatus,
    approveTimeLogStatus,
    rejectTimeLogStatus,
    fetchAllPayroll,
    updatePayrollAmount
} from './core.js';

let currentUser = null;
let currentRole = 'guest';

// Biến lưu trạng thái Bộ lọc đang chọn ở Tab Duyệt Báo cáo
window.currentReportFilter = 'all';

// Biến lưu trạng thái Bộ lọc ở Tab Thống kê giờ làm
window.currentTimeLogFilter = 'all';

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
        loadTimeTrackingStatus();
    });

    setupTabs();
    setupReportForm();
    setupEditReportForm();
    setupAssignTaskForm();
    setupWithdrawForm();
    setupTimeTrackingEvents();

    // Event listeners for report filtering
    document.getElementById('search-report-name')?.addEventListener('keyup', loadWorkReports);
    document.getElementById('search-report-date')?.addEventListener('change', loadWorkReports);
});

// ==========================================
// 3. PHÂN QUYỀN GIAO DIỆN (UI)
// ==========================================
function setupRoleBasedUI() {
    const managerTools = document.getElementById('manager-tools');
    const adminPayrollBtn = document.getElementById('admin-payroll-btn');
    const adminTimelogsBtn = document.getElementById('admin-timelogs-btn');
    const adminWalletsBtn = document.getElementById('admin-wallets-btn');
    const adminStatisticsBtn = document.getElementById('admin-statistics-btn');
    const timeTrackingWidget = document.getElementById('time-tracking-widget');

    if (['staff', 'admin', 'dev'].includes(currentRole)) {
        if (managerTools) managerTools.classList.remove('hidden');
    }

    if (['admin', 'dev'].includes(currentRole)) {
        if (adminPayrollBtn) adminPayrollBtn.classList.remove('hidden');
        if (adminTimelogsBtn) adminTimelogsBtn.classList.remove('hidden');
        if (adminWalletsBtn) adminWalletsBtn.classList.remove('hidden');
        if (adminStatisticsBtn) adminStatisticsBtn.classList.remove('hidden');
    }

    if (['media', 'helper', 'staff', 'dev', 'admin'].includes(currentRole)) {
        if (timeTrackingWidget) timeTrackingWidget.classList.remove('hidden');
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
            if (tabId === 'report') {
                loadMyTasks();
                loadMyReports();
            }
            if (tabId === 'manage-work') loadWorkReports();
            if (tabId === 'payroll') {
                loadPayrollAdmin();
                loadAdminWithdraws();
                loadAdminPayrollHistory();
            }
            if (tabId === 'user-wallets') {
                loadAdminUserBalances();
            }
            if (tabId === 'statistics') {
                loadStatistics();
            }
            if (tabId === 'assign-task') loadAdminTasks();
            if (tabId === 'time-logs') loadTimeLogs();
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
        const withdraws = await fetchMyWithdraws(currentUser.uid);
        
        let totalEarned = 0;
        let totalWithdrawn = 0;
        
        tbody.innerHTML = '';
        notifList.innerHTML = '';

        if (payrolls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Chưa có giao dịch nào</td></tr>';
            notifList.innerHTML = '<p class="text-gray-600 text-xs italic">Không có thông báo mới.</p>';
        } else {
            payrolls.forEach(p => {
                const amount = Number(p.amount) || 0;
                totalEarned += amount;
                const dateStr = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Đang cập nhật';

                tbody.innerHTML += `
                    <tr class="border-b border-white/5 hover:bg-white/5 transition">
                        <td class="p-4 text-gray-400">${dateStr}</td>
                        <td class="p-4 text-white">${p.reason}</td>
                        <td class="p-4 text-right font-bold text-green-400">+${amount.toLocaleString('vi-VN')} Coin</td>
                    </tr>
                `;

                notifList.innerHTML += `
                    <div class="bg-gradient-to-r from-green-500/10 to-transparent p-4 rounded-xl border border-green-500/20 shadow-sm mb-2">
                        <p class="text-xs text-gray-400 mb-1">${dateStr}</p>
                        <p class="text-sm text-white">💰 Bạn vừa nhận được <span class="text-green-400 font-bold">${amount.toLocaleString('vi-VN')} Coin</span></p>
                        <p class="text-xs text-gray-500 mt-1">Lý do: ${p.reason}</p>
                    </div>
                `;
            });
        }
        
        // Cập nhật Lịch sử Rút tiền
        const wList = document.getElementById('withdraw-history-list');
        wList.innerHTML = '';
        
        if (withdraws.length === 0) {
            wList.innerHTML = '<p class="text-gray-500 text-sm italic">Chưa có lệnh rút tiền nào.</p>';
        } else {
            withdraws.forEach(w => {
                if (w.status !== 'rejected') {
                    totalWithdrawn += (Number(w.amount) || 0);
                }
                const dateStr = w.createdAt ? new Date(w.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
                
                let statusBadge = '';
                if (w.status === 'approved') statusBadge = '<span class="px-2 py-1 rounded text-[10px] font-bold uppercase border text-green-400 border-green-500/50 bg-green-500/10">✅ Thành công</span>';
                else if (w.status === 'rejected') statusBadge = '<span class="px-2 py-1 rounded text-[10px] font-bold uppercase border text-red-400 border-red-500/50 bg-red-500/10">❌ Từ chối</span>';
                else statusBadge = '<span class="px-2 py-1 rounded text-[10px] font-bold uppercase border text-yellow-400 border-yellow-500/50 bg-yellow-500/10">⏳ Đang chờ</span>';
                
                let detailHtml = '';
                if (w.type === 'game') {
                    detailHtml = `<p class="text-xs text-cyan-400 font-bold mt-1">Vào Game (1:1): Nhận ${Number(w.amount).toLocaleString('vi-VN')} Coin Game</p>`;
                } else {
                    const vnd = Number(w.amount) * 500;
                    detailHtml = `
                        <p class="text-xs text-green-400 font-bold mt-1">Về ATM (1:0.5): Nhận ${vnd.toLocaleString('vi-VN')} VNĐ</p>
                        <p class="text-xs text-gray-400 mt-1">NH: ${w.bankName} - STK: ${w.accountNumber} - Tên: ${w.accountName || 'N/A'}</p>
                    `;
                }

                wList.innerHTML += `
                    <div class="bg-black/30 p-4 rounded-xl border border-white/5 mb-2">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs text-gray-400 font-mono">${dateStr}</span>
                            ${statusBadge}
                        </div>
                        <p class="text-sm font-bold text-yellow-400">- ${Number(w.amount).toLocaleString('vi-VN')} Coin</p>
                        ${detailHtml}
                        ${w.status === 'rejected' && w.rejectReason ? `<p class="text-xs text-red-400 mt-2 bg-red-900/30 p-2 rounded">Lý do: ${w.rejectReason}</p>` : ''}
                    </div>
                `;
            });
        }

        const balance = totalEarned - totalWithdrawn;
        totalEarnedEl.innerText = `${balance.toLocaleString('vi-VN')} Coin`;

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Lỗi kết nối máy chủ!</td></tr>`;
    }
}

// ==========================================
// 5B. CHỨC NĂNG: RÚT TIỀN (WITHDRAW)
// ==========================================
function setupWithdrawForm() {
    const typeSelect = document.getElementById('withdraw-type');
    const bankInfo = document.getElementById('withdraw-bank-info');
    const form = document.getElementById('withdraw-form');

    if (!typeSelect || !form) return;

    typeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'atm') {
            bankInfo.classList.remove('hidden');
        } else {
            bankInfo.classList.add('hidden');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = typeSelect.value;
        const amount = document.getElementById('withdraw-amount').value;
        const bank = document.getElementById('withdraw-bank').value.trim();
        const stk = document.getElementById('withdraw-stk').value.trim();
        const name = document.getElementById('withdraw-name')?.value.trim();
        const btn = e.target.querySelector('button');

        if (type === 'atm' && (!bank || !stk || !name)) {
            return showCustomModal("LỖI", "Vui lòng nhập đủ tên Ngân hàng, Số tài khoản và Tên chủ tài khoản!", "danger");
        }

        btn.innerText = "⏳ ĐANG TẠO LỆNH...";
        btn.disabled = true;

        try {
            await createWithdrawRequest(amount, type, bank, stk, name);
            showCustomModal("THÀNH CÔNG", "Đã tạo lệnh rút tiền thành công! Đang chờ admin xử lý.", "info");
            e.target.reset();
            bankInfo.classList.add('hidden');
            loadWallet(); // Cập nhật lại số dư và lịch sử
        } catch (err) {
            showCustomModal("LỖI", "❌ Tạo lệnh thất bại: " + getFirebaseErrorMessage(err) + (err.message ? " (" + err.message + ")" : ""), "danger");
        } finally {
            btn.innerText = "TẠO LỆNH RÚT 🚀";
            btn.disabled = false;
        }
    });
}

// ==========================================
// 5C. CHỨC NĂNG: DUYỆT RÚT TIỀN (Cho Admin)
// ==========================================
async function loadAdminWithdraws() {
    const list = document.getElementById('admin-withdraw-list');
    if (!list) return;

    list.innerHTML = '<p class="text-gray-500 text-sm italic animate-pulse">⏳ Đang tải lệnh rút tiền...</p>';

    try {
        const withdraws = await fetchAllWithdraws();
        // Chỉ lấy những lệnh pending
        const pendingWithdraws = withdraws.filter(w => w.status === 'pending');

        if (pendingWithdraws.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-sm italic">Hiện không có lệnh rút tiền nào chờ duyệt.</p>';
            return;
        }

        list.innerHTML = pendingWithdraws.map(w => {
            const dateStr = w.createdAt ? new Date(w.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
            let detailHtml = '';
            
            if (w.type === 'game') {
                detailHtml = `<p class="text-xs text-cyan-400 font-bold mb-2">🎮 Rút vào Game (1:1): Yêu cầu <span class="text-white bg-black/50 px-2 py-0.5 rounded">${Number(w.amount).toLocaleString('vi-VN')} Coin</span></p>`;
            } else {
                const vnd = Number(w.amount) * 500;
                detailHtml = `
                    <p class="text-xs text-green-400 font-bold mb-1">💳 Rút về ATM (1:0.5): Yêu cầu <span class="text-white bg-black/50 px-2 py-0.5 rounded">${vnd.toLocaleString('vi-VN')} VNĐ</span></p>
                    <p class="text-xs text-gray-300 mb-2">NH: <span class="font-bold text-white">${w.bankName}</span> - STK: <span class="font-bold text-white">${w.accountNumber}</span> - Tên: <span class="font-bold text-white">${w.accountName || 'N/A'}</span></p>
                `;
            }

            return `
                <div class="bg-black/30 p-4 rounded-xl border border-white/10 relative">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="font-bold text-yellow-400 text-sm block">${w.author}</span>
                            <span class="text-[10px] text-gray-500 font-mono">${dateStr}</span>
                        </div>
                        <span class="font-black text-red-400">- ${Number(w.amount).toLocaleString('vi-VN')} Coin</span>
                    </div>
                    
                    ${detailHtml}
                    
                    <div class="flex gap-2 mt-3">
                        <button onclick="window.rejectWithdrawAction('${w.id}')" class="flex-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 py-2 rounded-lg text-xs font-bold transition">TỪ CHỐI</button>
                        <button onclick="window.approveWithdrawAction('${w.id}')" class="flex-1 bg-green-600 hover:bg-green-500 text-white border border-green-500/50 py-2 rounded-lg text-xs font-bold transition">✅ ĐÃ CHUYỂN TIỀN</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        list.innerHTML = `<p class="text-red-500 text-sm">Lỗi tải danh sách rút tiền: ${e.message}</p>`;
    }
}

window.approveWithdrawAction = async (docId) => {
    showCustomModal("XÁC NHẬN", "Bạn chắc chắn đã chuyển tiền cho lệnh rút này?", "confirm", async () => {
        try {
            await updateWithdrawStatus(docId, 'approved');
            showCustomModal("THÀNH CÔNG", "Đã duyệt lệnh rút tiền!", "info");
            loadAdminWithdraws();
        } catch (e) { 
            showCustomModal("LỖI", "Lỗi khi duyệt: " + getFirebaseErrorMessage(e), "danger"); 
        }
    });
};

window.rejectWithdrawAction = async (docId) => {
    const reason = prompt("Nhập lý do từ chối lệnh rút tiền này (VD: Sai số tài khoản):");
    if (reason === null) return;
    if (!reason.trim()) return showCustomModal("LỖI", "Vui lòng nhập lý do từ chối!", "danger");

    try {
        await updateWithdrawStatus(docId, 'rejected', reason.trim());
        showCustomModal("THÀNH CÔNG", "Đã từ chối lệnh rút và hoàn lại Coin!", "info");
        loadAdminWithdraws();
    } catch (e) {
        showCustomModal("LỖI", "Lỗi khi từ chối: " + getFirebaseErrorMessage(e), "danger");
    }
};

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
            loadMyReports(); // Cập nhật lại danh sách báo cáo
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

        const nameFilter = document.getElementById('search-report-name')?.value.toLowerCase() || '';
        const dateFilter = document.getElementById('search-report-date')?.value || '';

        if (nameFilter) {
            reports = reports.filter(r => r.author?.toLowerCase().includes(nameFilter));
        }

        if (dateFilter) {
            reports = reports.filter(r => {
                if (!r.createdAt) return false;
                const d = new Date(r.createdAt.seconds * 1000);
                // Đảm bảo UTC offset hoặc lấy đúng ngày local
                const rDateStr = d.toLocaleDateString('sv-SE'); // sv-SE cho ra chuẩn YYYY-MM-DD
                return rDateStr === dateFilter;
            });
        }
        
        // 🟢 GÁN AVATAR ĐỘNG VÀO BIẾN TOÀN CỤC ĐỂ MODAL ĐỌC ĐƯỢC
        window.allLoadedReports = reports.map(r => ({
            ...r,
            avatar: userMap[r.uid] || r.avatar || `https://mc-heads.net/avatar/${r.author}`
        })); 

        // 🟢 SẮP XẾP ƯU TIÊN BÁO CÁO CHƯA DUYỆT LÊN TRƯỚC
        window.allLoadedReports.sort((a, b) => {
            const isApprovedA = a.status === 'approved' ? 1 : 0;
            const isApprovedB = b.status === 'approved' ? 1 : 0;
            if (isApprovedA !== isApprovedB) {
                return isApprovedA - isApprovedB; // 0 (pending) lên trước 1 (approved)
            }
            // Nếu cùng trạng thái thì xếp theo thời gian mới nhất
            const timeA = a.createdAt ? a.createdAt.seconds : 0;
            const timeB = b.createdAt ? b.createdAt.seconds : 0;
            return timeB - timeA;
        });
        
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
            <div class="mt-8 pt-6 border-t border-cyan-500/30 flex flex-col sm:flex-row justify-end gap-4">
                <button onclick="window.rejectReportAction('${r.id}')" class="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl text-sm title-font font-black w-full sm:w-auto transition shadow-lg shadow-red-900/50">
                    ❌ TỪ CHỐI
                </button>
                <button onclick="window.approveReportAction('${r.id}')" class="cyber-btn text-white px-8 py-3 rounded-xl text-sm title-font font-black w-full sm:w-auto flex items-center justify-center gap-2 transition-transform shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    ✅ CHẤP NHẬN
                </button>
            </div>
        ` : ''}

        ${r.editHistory && r.editHistory.length > 0 && ['admin', 'dev'].includes(currentRole) ? `
            <div class="mt-4 flex justify-end">
                <button onclick="window.viewHistoryAction('${r.id}')" class="text-xs text-gray-400 hover:text-white underline transition">
                    🕰️ Xem lịch sử chỉnh sửa
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

// Hàm xử lý khi Admin bấm Từ chối
window.rejectReportAction = async (docId) => {
    const reason = prompt("Nhập lý do từ chối báo cáo này:");
    if (reason === null) return; // Bấm Cancel
    if (!reason.trim()) return showCustomModal("LỖI", "Vui lòng nhập lý do từ chối!", "danger");

    try {
        await rejectWorkReport(docId, reason.trim());
        showCustomModal("THÀNH CÔNG", "Đã từ chối báo cáo!", "info");
        document.getElementById('report-detail-modal').classList.remove('active');
        loadWorkReports(); // Tải lại danh sách
    } catch (e) {
        showCustomModal("LỖI", "Lỗi khi từ chối: " + getFirebaseErrorMessage(e), "danger");
    }
};

window.viewHistoryAction = (docId) => {
    const r = window.allLoadedReports.find(x => x.id === docId) || window.myLoadedReports?.find(x => x.id === docId);
    if (!r || !r.editHistory) return;

    const modal = document.getElementById('history-modal');
    const content = document.getElementById('history-content');

    let historyHtml = r.editHistory.map((h, idx) => {
        const timeStr = h.editedAt ? new Date(h.editedAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
        return `
            <div class="glass-panel p-4 rounded-xl border border-white/10 mb-4">
                <p class="text-xs text-gray-400 mb-2">Bản lưu lúc: ${timeStr}</p>
                <p class="text-sm text-white mb-2"><strong>Công việc:</strong> ${h.task}</p>
                <p class="text-sm text-cyan-400 mb-2"><strong>Tiến độ:</strong> ${h.percent}%</p>
                ${h.link ? `<p class="text-sm text-purple-300"><strong>Link:</strong> <a href="${h.link}" target="_blank" class="underline">${h.link}</a></p>` : ''}
                ${h.images && h.images.length > 0 ? `
                    <div class="mt-2 flex gap-2 overflow-x-auto">
                        ${h.images.map(img => `<img src="${img}" class="h-16 rounded">`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    content.innerHTML = historyHtml;
    modal.classList.add('active');
};

// ==========================================
// 7C. LỊCH SỬ BÁO CÁO CÁ NHÂN VÀ CHỈNH SỬA
// ==========================================
window.myLoadedReports = [];

async function loadMyReports() {
    const list = document.getElementById('my-reports-list');
    if (!list || !currentUser) return;

    try {
        const reports = await fetchMyWorkReports(currentUser.uid);
        window.myLoadedReports = reports;

        if (reports.length === 0) {
            list.innerHTML = '<div class="col-span-full p-4 text-center text-gray-500 italic">Chưa có báo cáo nào.</div>';
            return;
        }

        list.innerHTML = reports.map(r => {
            const dateStr = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
            let statusBadge = '';
            let editBtn = '';
            
            if (r.status === 'approved') {
                statusBadge = '<span class="px-2 py-1 rounded text-[10px] font-bold uppercase border text-green-400 border-green-500/50 bg-green-500/10">✅ Đã Duyệt</span>';
            } else if (r.status === 'rejected') {
                statusBadge = '<span class="px-2 py-1 rounded text-[10px] font-bold uppercase border text-red-400 border-red-500/50 bg-red-500/10">❌ Từ Chối</span>';
            } else {
                statusBadge = '<span class="px-2 py-1 rounded text-[10px] font-bold uppercase border text-yellow-400 border-yellow-500/50 bg-yellow-500/10">⏳ Đang Chờ</span>';
                editBtn = `<button onclick="window.openEditReportModal('${r.id}')" class="text-xs text-blue-400 hover:text-white underline mt-2">Chỉnh sửa báo cáo ➔</button>`;
            }

            return `
                <div class="bg-black/30 p-4 rounded-xl border border-white/5 relative flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs text-gray-400 font-mono">${dateStr}</span>
                            ${statusBadge}
                        </div>
                        <p class="text-sm text-gray-200 line-clamp-2 mb-2 font-bold">${r.task}</p>
                        <p class="text-xs text-cyan-400 font-bold mb-2">Tiến độ: ${r.percent}%</p>
                        ${r.status === 'rejected' && r.rejectReason ? `<p class="text-xs text-red-400 bg-red-500/10 p-2 rounded"><strong>Lý do từ chối:</strong> ${r.rejectReason}</p>` : ''}
                    </div>
                    <div class="text-right">
                        ${editBtn}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        list.innerHTML = `<div class="col-span-full text-red-500 text-sm">Lỗi tải danh sách: ${e.message}</div>`;
    }
}

window.openEditReportModal = (docId) => {
    const r = window.myLoadedReports.find(x => x.id === docId);
    if (!r) return;
    
    document.getElementById('edit-report-id').value = r.id;
    document.getElementById('edit-report-task').value = r.task;
    document.getElementById('edit-report-percent').value = r.percent;
    document.getElementById('edit-report-link').value = r.link || '';
    document.getElementById('edit-report-images').value = '';
    
    const previewContainer = document.getElementById('edit-report-image-preview');
    previewContainer.innerHTML = '';
    if (r.images && r.images.length > 0) {
        r.images.forEach(img => {
            previewContainer.innerHTML += `<img src="${img}" class="h-16 rounded object-cover border border-cyan-500/50 opacity-70">`;
        });
    }

    document.getElementById('edit-report-modal').classList.add('active');
};

function setupEditReportForm() {
    const form = document.getElementById('edit-report-form');
    const imageInput = document.getElementById('edit-report-images');
    const previewContainer = document.getElementById('edit-report-image-preview');
    if (!form) return;

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
                previewContainer.innerHTML += `<img src="${e.target.result}" class="h-16 rounded object-cover border border-cyan-500/50">`;
            };
            reader.readAsDataURL(file);
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = document.getElementById('edit-report-id').value;
        const task = document.getElementById('edit-report-task').value.trim();
        const percent = document.getElementById('edit-report-percent').value;
        const link = document.getElementById('edit-report-link').value.trim();
        const files = Array.from(imageInput.files);
        const btn = e.target.querySelector('button');

        btn.innerText = "⏳ ĐANG LƯU VẾT & CẬP NHẬT...";
        btn.disabled = true;

        try {
            let imageUrls = [];
            // Nếu người dùng có chọn ảnh mới, thì tải lên, nếu không thì không đụng đến r.images cũ
            if (files.length > 0) {
                for (const file of files) {
                    const url = await uploadImage(file);
                    imageUrls.push(url);
                }
            }

            const r = window.myLoadedReports.find(x => x.id === docId);
            const newData = {
                task: task,
                percent: Number(percent),
                link: link
            };
            
            if (files.length > 0) {
                newData.images = imageUrls;
            } else {
                newData.images = r.images || [];
            }

            await editWorkReportUser(docId, newData);
            
            showCustomModal("THÀNH CÔNG", "Đã cập nhật báo cáo thành công!", "info");
            document.getElementById('edit-report-modal').classList.remove('active');
            loadMyReports(); // Cập nhật UI
            
        } catch (err) {
            showCustomModal("LỖI", "❌ Cập nhật thất bại: " + getFirebaseErrorMessage(err), "danger");
        } finally {
            btn.innerText = "CẬP NHẬT & LƯU VẾT";
            btn.disabled = false;
        }
    });
}

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

// ==========================================
// 9. HỆ THỐNG ĐIỂM DANH (TIME TRACKING)
// ==========================================
let currentLogId = null;
let timeTrackingEventAttached = false;

function setupTimeTrackingEvents() {
    const btnIn = document.getElementById('btn-clock-in');
    const btnOut = document.getElementById('btn-clock-out');
    const statusText = document.getElementById('time-tracking-status');
    if (!btnIn || !btnOut) return;

    if (!timeTrackingEventAttached) {
        timeTrackingEventAttached = true;
        
        btnIn.addEventListener('click', async () => {
            btnIn.disabled = true;
            btnIn.innerText = "ĐANG XỬ LÝ...";
            try {
                const docRef = await clockIn();
                currentLogId = docRef.id;
                const inTime = new Date().toLocaleTimeString('vi-VN');
                statusText.innerHTML = `Đang làm việc (Bắt đầu từ: <span class="text-green-400 font-bold">${inTime}</span>)`;
                btnIn.classList.add('hidden');
                btnOut.classList.remove('hidden');
                showCustomModal("THÀNH CÔNG", "Đã bắt đầu ghi nhận thời gian làm việc!", "info");
            } catch (e) {
                showCustomModal("LỖI", "Không thể bắt đầu: " + getFirebaseErrorMessage(e), "danger");
            } finally {
                btnIn.disabled = false;
                btnIn.innerText = "BẮT ĐẦU LÀM VIỆC";
            }
        });

        btnOut.addEventListener('click', async () => {
            if (!currentLogId) return;
            btnOut.disabled = true;
            btnOut.innerText = "ĐANG XỬ LÝ...";
            try {
                await clockOut(currentLogId);
                currentLogId = null;
                statusText.innerHTML = `Trạng thái: <span class="text-gray-500 font-bold">Chưa bắt đầu</span>`;
                btnOut.classList.add('hidden');
                btnIn.classList.remove('hidden');
                showCustomModal("THÀNH CÔNG", "Đã kết thúc phiên làm việc và ghi nhận thời gian!", "info");
            } catch (e) {
                showCustomModal("LỖI", "Không thể kết thúc: " + getFirebaseErrorMessage(e), "danger");
            } finally {
                btnOut.disabled = false;
                btnOut.innerText = "KẾT THÚC (OFFLINE)";
            }
        });
    }
}

async function loadTimeTrackingStatus() {
    const btnIn = document.getElementById('btn-clock-in');
    const btnOut = document.getElementById('btn-clock-out');
    const statusText = document.getElementById('time-tracking-status');
    if (!btnIn || !btnOut || !currentUser) return;
    
    try {
        const log = await fetchCurrentTimeLog(currentUser.uid);
        if (log) {
            currentLogId = log.id;
            const inTime = new Date(log.clockInTime.seconds * 1000).toLocaleTimeString('vi-VN');
            statusText.innerHTML = `Đang làm việc (Bắt đầu từ: <span class="text-green-400 font-bold">${inTime}</span>)`;
            btnIn.classList.add('hidden');
            btnOut.classList.remove('hidden');
        } else {
            currentLogId = null;
            statusText.innerHTML = `Trạng thái: <span class="text-gray-500 font-bold">Chưa bắt đầu</span>`;
            btnOut.classList.add('hidden');
            btnIn.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Lỗi lấy trạng thái điểm danh:", e);
    }
}



async function loadTimeLogs() {
    const tbody = document.getElementById('time-logs-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500 animate-pulse">⏳ Đang tải dữ liệu điểm danh...</td></tr>';

    try {
        const logs = await fetchAllTimeLogs();
        
        const searchInput = document.getElementById('time-log-search')?.value.toLowerCase().trim() || '';
        const monthInput = document.getElementById('time-log-month')?.value || '';
        
        // Populate select if empty
        const searchSelect = document.getElementById('time-log-search');
        if (searchSelect && searchSelect.options.length <= 1) {
            const users = await fetchAllUsers();
            users.filter(u => ['admin', 'dev', 'staff', 'media', 'helper'].includes(u.role)).forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.username.toLowerCase();
                opt.textContent = u.username;
                searchSelect.appendChild(opt);
            });
        }

        const filteredLogs = logs.filter(l => {
            let matchSearch = true;
            let matchMonth = true;
            let matchRole = true;
            
            if (searchInput) {
                matchSearch = (l.username || '').toLowerCase() === searchInput;
            }
            
            if (monthInput && l.clockInTime) {
                const date = new Date(l.clockInTime.seconds * 1000);
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const yyyy = date.getFullYear();
                const logMonth = `${yyyy}-${mm}`;
                matchMonth = logMonth === monthInput;
            }

            if (window.currentTimeLogFilter !== 'all') {
                matchRole = (l.role || 'member') === window.currentTimeLogFilter;
            }
            
            return matchSearch && matchMonth && matchRole;
        });

        // Sắp xếp: Online (đang làm) -> Offline (chờ duyệt) -> Approved (đã duyệt) -> Theo thời gian
        filteredLogs.sort((a, b) => {
            const getStatusScore = (s) => {
                if (s === 'online') return 0;
                if (s === 'offline') return 1; // pending approval
                return 2; // approved
            };
            const scoreA = getStatusScore(a.status);
            const scoreB = getStatusScore(b.status);
            if (scoreA !== scoreB) {
                return scoreA - scoreB;
            }
            const timeA = a.clockInTime ? a.clockInTime.seconds : 0;
            const timeB = b.clockInTime ? b.clockInTime.seconds : 0;
            return timeB - timeA;
        });



        if (filteredLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500 italic">Chưa có dữ liệu hoặc không tìm thấy.</td></tr>';
            return;
        }
        
        const role = localStorage.getItem('cached_user_role') || 'member';
        const isAdmin = role === 'admin' || role === 'manager' || role === 'owner';
        
        const thead = document.getElementById('time-logs-head');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th class="p-4">Tên Nhân Sự</th>
                    <th class="p-4">Bộ Phận</th>
                    <th class="p-4">Trạng Thái</th>
                    <th class="p-4">Bắt Đầu (Clock In)</th>
                    <th class="p-4">Kết Thúc (Clock Out)</th>
                    <th class="p-4 text-right">Tổng Thời Gian</th>
                    ${isAdmin ? '<th class="p-4 text-center">Thao Tác</th>' : ''}
                </tr>
            `;
        }

        tbody.innerHTML = filteredLogs.map(l => {
            const inTime = l.clockInTime ? new Date(l.clockInTime.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
            const outTime = l.clockOutTime ? new Date(l.clockOutTime.seconds * 1000).toLocaleString('vi-VN') : '--';
            
            let statusHtml = '';
            if (l.status === 'online') statusHtml = '<span class="text-green-400 font-bold text-xs bg-green-500/10 px-2 py-1 rounded border border-green-500/30">ONLINE</span>';
            else if (l.status === 'approved') statusHtml = '<span class="text-blue-400 font-bold text-xs bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30">ĐÃ DUYỆT</span>';
            else if (l.status === 'rejected') statusHtml = '<span class="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded border border-red-500/30">TỪ CHỐI (X)</span>';
            else statusHtml = '<span class="text-gray-400 font-bold text-xs bg-white/5 px-2 py-1 rounded border border-white/10">OFFLINE</span>';
            
            const duration = l.durationMinutes ? `${Math.floor(l.durationMinutes/60)}h ${l.durationMinutes%60}m` : '--';
            
            let adminAction = '';
            if (isAdmin) {
                if (l.status === 'offline') {
                    adminAction = `
                        <div class="flex gap-1 justify-center">
                            <button onclick="window.approveTimeLog('${l.id}')" class="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1.5 rounded-lg border border-blue-500/50 shadow-[0_0_10px_rgba(37,99,235,0.3)] transition font-bold">Duyệt</button>
                            <button onclick="window.rejectTimeLog('${l.id}')" class="bg-red-600 hover:bg-red-500 text-white text-[10px] px-2 py-1.5 rounded-lg border border-red-500/50 transition font-bold">Từ Chối (X)</button>
                        </div>
                    `;
                } else if (l.status === 'approved') {
                    adminAction = `<span class="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30 font-bold">Đã Duyệt ✅</span>`;
                } else if (l.status === 'rejected') {
                    adminAction = `<span class="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/30 font-bold">Đã Từ Chối ❌</span>`;
                }
            }

            return `
                <tr class="border-b border-white/5 hover:bg-white/5 transition">
                    <td class="p-4 font-bold text-white">${l.username}</td>
                    <td class="p-4"><span class="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase">${l.role}</span></td>
                    <td class="p-4">${statusHtml}</td>
                    <td class="p-4 text-gray-400 text-xs">${inTime}</td>
                    <td class="p-4 text-gray-400 text-xs">${outTime}</td>
                    <td class="p-4 text-right font-bold text-cyan-400">${duration}</td>
                    ${isAdmin ? `<td class="p-4 text-center">${adminAction}</td>` : ''}
                </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">Lỗi tải dữ liệu: ${e.message}</td></tr>`;
    }
}

window.approveTimeLog = async (logId) => {
    showCustomModal("XÁC NHẬN", "Bạn có chắc chắn muốn duyệt giờ làm này?", "confirm", async () => {
        try {
            await approveTimeLogStatus(logId);
            showCustomModal("THÀNH CÔNG", "Đã duyệt giờ làm thành công!", "info");
            loadTimeLogs();
        } catch (e) {
            showCustomModal("LỖI", "Lỗi khi duyệt: " + getFirebaseErrorMessage(e), "danger");
        }
    });
};

window.rejectTimeLog = async (logId) => {
    showCustomModal("XÁC NHẬN", "Bạn có chắc chắn muốn từ chối (bỏ xác nhận) giờ làm này?", "confirm", async () => {
        try {
            await rejectTimeLogStatus(logId);
            showCustomModal("THÀNH CÔNG", "Đã từ chối giờ làm!", "info");
            loadTimeLogs();
        } catch (e) {
            showCustomModal("LỖI", "Lỗi: " + getFirebaseErrorMessage(e), "danger");
        }
    });
};

window.filterTimeLogs = (role) => {
    window.currentTimeLogFilter = role;
    
    // Cập nhật UI nút filter
    document.querySelectorAll('.tl-filter-btn').forEach(btn => {
        btn.classList.remove('bg-cyan-600', 'text-white', 'shadow-[0_0_10px_rgba(34,211,238,0.4)]', 'border-cyan-400');
        btn.classList.add('text-gray-400', 'border-transparent');
    });
    
    const activeBtn = document.getElementById(`tl-filter-${role}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-400', 'border-transparent');
        activeBtn.classList.add('bg-cyan-600', 'text-white', 'shadow-[0_0_10px_rgba(34,211,238,0.4)]', 'border-cyan-400');
    }
    
    loadTimeLogs();
};

async function loadAdminPayrollHistory() {
    const list = document.getElementById('admin-payroll-history');
    if (!list) return;

    list.innerHTML = '<p class="text-gray-500 text-sm italic animate-pulse">⏳ Đang tải lịch sử...</p>';

    try {
        const payrolls = await fetchAllPayroll();
        if (payrolls.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-sm italic">Chưa có dữ liệu.</p>';
            return;
        }

        const users = await fetchAllUsers();
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.username);

        list.innerHTML = payrolls.map(p => {
            const dateStr = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
            const username = userMap[p.uid] || 'Unknown';
            return `
                <div class="bg-black/30 p-4 rounded-xl border border-white/10 mb-2 relative">
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-bold text-green-400 text-sm block">Đến: ${username}</span>
                        <span class="text-[10px] text-gray-500 font-mono">${dateStr}</span>
                    </div>
                    <p class="text-sm font-bold text-white mb-1">Số lượng: <span class="text-yellow-400">${Number(p.amount).toLocaleString('vi-VN')} Coin</span></p>
                    <p class="text-xs text-gray-400 mb-2">Lý do: ${p.reason}</p>
                    <button onclick="window.editPayrollAmountAction('${p.id}', ${p.amount})" class="absolute bottom-4 right-4 bg-blue-600/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 px-3 py-1 rounded text-xs transition">Sửa số lượng</button>
                </div>
            `;
        }).join('');
    } catch (e) {
        list.innerHTML = `<p class="text-red-500 text-sm">Lỗi tải danh sách: ${e.message}</p>`;
    }
}

window.editPayrollAmountAction = (docId, oldAmount) => {
    const newAmount = prompt(`Nhập số lượng Coin mới (Số lượng cũ: ${oldAmount}):`, oldAmount);
    if (newAmount === null || newAmount.trim() === '') return;
    if (isNaN(newAmount) || Number(newAmount) < 0) return showCustomModal("LỖI", "Số lượng không hợp lệ!", "danger");

    showCustomModal("XÁC NHẬN", `Bạn muốn đổi số tiền thành ${Number(newAmount).toLocaleString()} Coin?`, "confirm", async () => {
        try {
            await updatePayrollAmount(docId, newAmount);
            showCustomModal("THÀNH CÔNG", "Đã cập nhật số lượng!", "info");
            loadAdminPayrollHistory();
            loadAdminUserBalances(); // reload balances after edit
        } catch (e) {
            showCustomModal("LỖI", "Lỗi: " + getFirebaseErrorMessage(e), "danger");
        }
    });
};

async function loadAdminUserBalances() {
    const tbody = document.getElementById('admin-user-balances-body');
    if (!tbody) return;

    try {
        const [users, payrolls, withdraws] = await Promise.all([
            fetchAllUsers(),
            fetchAllPayroll(),
            fetchAllWithdraws()
        ]);

        const userBalances = {};

        const staffUsers = users.filter(u => ['admin', 'dev', 'staff', 'media', 'helper'].includes(u.role));
        staffUsers.forEach(u => {
            userBalances[u.id] = {
                username: u.username,
                role: u.role,
                totalEarned: 0,
                totalWithdrawn: 0
            };
        });

        payrolls.forEach(p => {
            if (userBalances[p.uid]) {
                userBalances[p.uid].totalEarned += (Number(p.amount) || 0);
            }
        });

        withdraws.forEach(w => {
            if (userBalances[w.uid] && w.status !== 'rejected') {
                userBalances[w.uid].totalWithdrawn += (Number(w.amount) || 0);
            }
        });

        const rows = Object.values(userBalances).map(u => {
            const balance = u.totalEarned - u.totalWithdrawn;
            return `
                <tr class="border-b border-white/5 hover:bg-white/5 transition">
                    <td class="p-4 font-bold text-white">${u.username}</td>
                    <td class="p-4 text-center"><span class="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase">${u.role}</span></td>
                    <td class="p-4 text-right font-bold text-green-400">${u.totalEarned.toLocaleString('vi-VN')}</td>
                    <td class="p-4 text-right font-bold text-red-400">${u.totalWithdrawn.toLocaleString('vi-VN')}</td>
                    <td class="p-4 text-right font-black text-yellow-400 text-lg">${balance.toLocaleString('vi-VN')}</td>
                    <td class="p-4 text-center">
                        <button onclick="window.editUserBalance('${u.id}', ${balance})" class="bg-blue-600/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 px-3 py-1.5 rounded text-xs transition font-bold shadow-[0_0_10px_rgba(37,99,235,0.2)]">Sửa Coin</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = rows.join('') || '<tr><td colspan="6" class="p-4 text-center text-gray-500 italic">Không có dữ liệu nhân sự.</td></tr>';
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Lỗi tính toán: ${e.message}</td></tr>`;
    }
}

window.editUserBalance = (uid, currentBalance) => {
    const newBalanceStr = prompt(`Nhập số dư Coin mới cho nhân viên (Số dư hiện tại: ${currentBalance}):`, currentBalance);
    if (newBalanceStr === null || newBalanceStr.trim() === '') return;
    
    const newBalance = Number(newBalanceStr);
    if (isNaN(newBalance)) return showCustomModal("LỖI", "Số dư không hợp lệ!", "danger");

    const diff = newBalance - currentBalance;
    if (diff === 0) return; // No change

    showCustomModal("XÁC NHẬN", `Xác nhận đổi số dư thành ${newBalance.toLocaleString()} Coin? (Hệ thống sẽ tạo giao dịch ${diff > 0 ? '+' : ''}${diff.toLocaleString()} Coin)`, "confirm", async () => {
        try {
            await createPayrollEntry(uid, diff, "Admin điều chỉnh số dư ví");
            showCustomModal("THÀNH CÔNG", "Đã cập nhật số dư!", "info");
            loadAdminUserBalances();
        } catch (e) {
            showCustomModal("LỖI", "Lỗi: " + getFirebaseErrorMessage(e), "danger");
        }
    });
};

async function loadStatistics() {
    const summaryBody = document.getElementById('time-logs-summary-body');
    const monthInputEl = document.getElementById('stats-month');
    if (!summaryBody || !monthInputEl) return;

    let summaryMonth = monthInputEl.value;
    if (!summaryMonth) {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        summaryMonth = `${yyyy}-${mm}`;
        monthInputEl.value = summaryMonth;
    }

    summaryBody.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-gray-500 animate-pulse">⏳ Đang tải thống kê...</td></tr>';

    try {
        const logs = await fetchAllTimeLogs();
        const userStats = {};
        
        logs.forEach(l => {
            if (l.status === 'approved' && l.clockInTime) {
                const date = new Date(l.clockInTime.seconds * 1000);
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const yyyy = date.getFullYear();
                if (`${yyyy}-${mm}` === summaryMonth) {
                    const uid = l.uid;
                    if (!userStats[uid]) userStats[uid] = { username: l.username, totalMins: 0, reports: 0 };
                    userStats[uid].totalMins += (Number(l.durationMinutes) || 0);
                }
            }
        });

        const allReports = await fetchAllWorkReports();
        allReports.forEach(r => {
            if (r.status === 'approved' && r.createdAt) {
                const date = new Date(r.createdAt.seconds * 1000);
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const yyyy = date.getFullYear();
                if (`${yyyy}-${mm}` === summaryMonth) {
                    const uid = r.uid;
                    if (!userStats[uid]) userStats[uid] = { username: r.author || r.uid, totalMins: 0, reports: 0 };
                    userStats[uid].reports += 1;
                }
            }
        });

        if (Object.keys(userStats).length === 0) {
            summaryBody.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-gray-500 italic">Không có dữ liệu đã duyệt trong tháng này.</td></tr>';
        } else {
            const statRows = Object.values(userStats).sort((a,b) => b.totalMins - a.totalMins).map(st => {
                const hrs = Math.floor(st.totalMins / 60);
                const mins = st.totalMins % 60;
                return `
                    <tr class="border-b border-white/5 hover:bg-white/5">
                        <td class="p-3 font-bold text-white">${st.username}</td>
                        <td class="p-3 text-center text-purple-400 font-bold">${st.reports} bài</td>
                        <td class="p-3 text-right text-cyan-400 font-bold">${hrs}h ${mins}m</td>
                    </tr>
                `;
            });
            summaryBody.innerHTML = statRows.join('');
        }
    } catch (e) {
        summaryBody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-red-500">Lỗi: ${e.message}</td></tr>`;
    }
}
window.loadStatistics = loadStatistics;
