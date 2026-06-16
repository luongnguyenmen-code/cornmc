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
    uploadImage, 
    editDocument 
} from './core.js';

// Biến toàn cục lưu trạng thái người dùng
let currentUser = null;
let currentRole = 'guest';

// ==========================================
// 2. KHỞI TẠO DASHBOARD
// ==========================================
window.addEventListener('load', () => {
    // Theo dõi trạng thái đăng nhập
    subscribeToAuth((user, role) => {
        if (!user) {
            // Nếu chưa đăng nhập, đá về trang chủ
            window.location.href = '/';
            return;
        }
        
        currentUser = user;
        currentRole = role;
        
        // Phân quyền hiển thị Menu
        setupRoleBasedUI();
        
        // Mặc định load tab ví tiền
        loadWallet();
    });

    // Cài đặt sự kiện chuyển tab
    setupTabs();
    
    // Cài đặt sự kiện submit form báo cáo
    setupReportForm();
});

// ==========================================
// 3. PHÂN QUYỀN GIAO DIỆN (UI)
// ==========================================
function setupRoleBasedUI() {
    const managerTools = document.getElementById('manager-tools');
    const adminPayrollBtn = document.getElementById('admin-payroll-btn');

    // Hiện công cụ quản lý cho Staff, Dev, Admin
    if (['staff', 'admin', 'dev'].includes(currentRole)) {
        if (managerTools) managerTools.classList.remove('hidden');
    }

    // Hiện nút phát lương chỉ cho Admin, Dev
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
            // Xóa active tất cả nút
            buttons.forEach(l => l.classList.remove('active', 'bg-white/5'));
            
            // Thêm active cho nút được click
            e.currentTarget.classList.add('active');

            // Ẩn tất cả nội dung
            contents.forEach(tab => tab.classList.add('hidden'));

            // Hiện nội dung tương ứng
            const tabId = e.currentTarget.getAttribute('data-tab');
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) targetTab.classList.remove('hidden');

            // Load dữ liệu động theo từng tab
            if (tabId === 'wallet') loadWallet();
            if (tabId === 'manage-work') loadWorkReports();
            if (tabId === 'payroll') loadPayrollAdmin();
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
            
            // Xử lý ngày tháng an toàn
            const dateStr = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Đang cập nhật';

            // Thêm vào bảng lịch sử
            tbody.innerHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5 transition">
                    <td class="p-4 text-gray-400">${dateStr}</td>
                    <td class="p-4 text-white">${p.reason}</td>
                    <td class="p-4 text-right font-bold text-green-400">+${amount.toLocaleString('vi-VN')}đ</td>
                </tr>
            `;

            // Thêm vào danh sách thông báo (giả lập thông báo từ lịch sử nhận lương)
            notifList.innerHTML += `
                <div class="bg-gradient-to-r from-green-500/10 to-transparent p-4 rounded-xl border border-green-500/20 shadow-sm">
                    <p class="text-xs text-gray-400 mb-1">${dateStr}</p>
                    <p class="text-sm text-white">💰 Bạn vừa nhận được <span class="text-green-400 font-bold">${amount.toLocaleString('vi-VN')}đ</span></p>
                    <p class="text-xs text-gray-500 mt-1">Lý do: ${p.reason}</p>
                </div>
            `;
        });

        // Cập nhật tổng tiền
        totalEarnedEl.innerText = `${total.toLocaleString('vi-VN')} Coin`;

    } catch (error) {
        console.error("Lỗi tải ví tiền:", error);
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Lỗi kết nối máy chủ!</td></tr>`;
    }
}

// ==========================================
// 6. CHỨC NĂNG: GỬI BÁO CÁO CÔNG VIỆC
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
            imageInput.value = ''; // Xóa chọn
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML += `<img src="${e.target.result}" class="w-16 h-16 object-cover rounded-lg border border-cyan-500/50 shadow-md">`;
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

        btn.innerText = "⏳ ĐANG UPLOAD ẢNH & XỬ LÝ...";
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            let imageUrls = [];
            
            // Nếu có chọn ảnh, duyệt qua từng ảnh để upload lên ImgBB
            if (files.length > 0) {
                for (const file of files) {
                    const url = await uploadImage(file);
                    imageUrls.push(url);
                }
            }

            // Gửi dữ liệu kèm mảng chứa các link ảnh
            await submitWorkReport({ 
                task, 
                percent: Number(percent), 
                link,
                images: imageUrls 
            });
            
            alert("✅ Đã gửi báo cáo thành công! Chờ quản lý duyệt.");
            e.target.reset();
            previewContainer.innerHTML = ''; // Xóa sạch xem trước ảnh
        } catch (err) {
            alert("❌ Gửi thất bại: " + err.message);
        } finally {
            btn.innerText = "GỬI BÁO CÁO 🚀";
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
}

// ==========================================
// 7. CHỨC NĂNG: DUYỆT BÁO CÁO (DÀNH CHO QUẢN LÝ)
// ==========================================
async function loadWorkReports() {
    const listContainer = document.getElementById('all-reports-list');
    listContainer.innerHTML = '<div class="text-center text-gray-500 py-8">⏳ Đang tải dữ liệu báo cáo...</div>';

    try {
        const reports = await fetchAllWorkReports();
        
        if (reports.length === 0) {
            listContainer.innerHTML = '<div class="glass-panel p-6 text-center text-gray-500 rounded-xl">Chưa có báo cáo nào được gửi.</div>';
            return;
        }

        listContainer.innerHTML = reports.map(r => {
            const isApproved = r.status === 'approved';
            const statusColor = isApproved ? 'text-green-400 border-green-500/50 bg-green-500/10' : 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
            const statusText = isApproved ? '✅ Đã Duyệt' : '⏳ Chờ Duyệt';
            const dateStr = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'N/A';
            
            // Kiểm tra quyền: Chỉ hiện nút duyệt nếu báo cáo chưa duyệt và user hiện tại có quyền
            const canApprove = !isApproved && ['admin', 'dev', 'staff'].includes(currentRole);

            return `
                <div class="glass-panel p-6 rounded-2xl border-l-4 ${isApproved ? 'border-green-500' : 'border-yellow-500'} relative group hover:bg-white/5 transition">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="font-black text-white text-lg">${r.author}</h4>
                            <span class="text-xs text-gray-500 font-mono">${dateStr}</span>
                        </div>
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColor}">
                            ${statusText}
                        </span>
                    </div>
                    
                    <div class="mb-4">
                        <p class="text-cyan-200 font-bold mb-2 text-sm uppercase tracking-wide">Nhiệm vụ:</p>
                        <p class="text-white text-lg">${r.task}</p>
                    </div>
                    
                    <div class="flex items-center gap-4 mb-4">
                        <div class="flex-1 bg-black/50 rounded-full h-3 border border-white/10 overflow-hidden">
                            <div class="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full" style="width: ${r.percent}%"></div>
                        </div>
                        <span class="text-sm font-bold text-cyan-400 w-12">${r.percent}%</span>
                    </div>
                    
                    ${r.link ? `<a href="${r.link}" target="_blank" class="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition">🔗 Xem đính kèm / kết quả</a>` : ''}
                    
                    ${canApprove ? `
                        <div class="mt-4 pt-4 border-t border-white/10 text-right">
                            <button onclick="window.approveReportAction('${r.id}')" class="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-green-900/30 transition">
                                ĐÁNH GIÁ & DUYỆT BÀI
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (e) {
        listContainer.innerHTML = `<div class="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/30">Lỗi tải báo cáo: ${e.message}</div>`;
    }
}

// Cấp quyền gọi hàm duyệt báo cáo ra global (để HTML onClick dùng được)
window.approveReportAction = async (docId) => {
    if (confirm("Xác nhận duyệt báo cáo công việc này?")) {
        try {
            await editDocument("work_reports", docId, { status: "approved" });
            alert("Đã duyệt báo cáo thành công!");
            loadWorkReports(); // Tải lại danh sách
        } catch (e) {
            alert("Lỗi khi duyệt: " + e.message);
        }
    }
};

// ==========================================
// 8. CHỨC NĂNG: QUẢN LÝ LƯƠNG & THƯỞNG (ADMIN)
// ==========================================
async function loadPayrollAdmin() {
    const panel = document.getElementById('payroll-admin-panel');
    panel.innerHTML = '<div class="text-center text-gray-500 py-8">⏳ Đang tải dữ liệu nhân sự...</div>';

    try {
        // Lấy danh sách toàn bộ Users để hiển thị trong Menu Select
        const users = await fetchAllUsers();
        
        // Lọc ra những người có chức vụ (tùy chọn)
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
                    <input type="number" id="pay-amount" min="0" class="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white outline-none focus:border-cyan-500" placeholder="VD: 500000" required>
                </div>
                
                <div>
                    <label class="block text-xs font-bold mb-2 uppercase text-cyan-400">📝 Lý do phát lương / thưởng</label>
                    <input type="text" id="pay-reason" class="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white outline-none focus:border-cyan-500" placeholder="VD: Lương cứng tháng 7 + Thưởng mẫn cán" required>
                </div>
                
                <button type="submit" class="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black w-full py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
                    PHÁT LƯƠNG & GỬI THÔNG BÁO 🚀
                </button>
            </form>
        `;

        // Bắt sự kiện Submit lệnh phát lương
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
            } catch (err) {
                alert("❌ Lỗi giao dịch: " + err.message);
            } finally {
                btn.innerText = "PHÁT LƯƠNG & GỬI THÔNG BÁO 🚀";
                btn.disabled = false;
            }
        });

    } catch (e) {
        panel.innerHTML = `<div class="text-red-500 p-4">Lỗi tải form quản lý: ${e.message}</div>`;
    }
}