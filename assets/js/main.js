// ==========================================
// 1. IMPORT (Lấy hết các hàm từ data.js)
// ==========================================
import {
    subscribeToAuth, loginEmail, registerEmail, loginGoogle, logout,
    fetchNews, fetchGuides, fetchForumPosts, createPost,
    fetchAllUsers, fetchMyPosts, fetchStaffMembers, defaultConfig, loginUser, deleteUserAndData,
    updateUserProfile, editDocument, registerUser, resetPassword,
    createGiveaway, fetchActiveGiveaways, joinGiveaway, endGiveaway, sendDiscordWebhook,
    deleteDocument, fetchComments, addComment, deleteComment
} from './core.js';
import { uploadImage } from './core.js';

// Biến toàn cục lưu trạng thái
let currentUser = null;
let currentRole = 'guest';
let currentUserData = null;

function showCustomModal(title, message, type = 'info', onConfirm = null) {
    const modal = document.getElementById('global-modal');
    const titleEl = document.getElementById('global-modal-title');
    const msgEl = document.getElementById('global-modal-message');
    const actionsEl = document.getElementById('global-modal-actions');
    const iconEl = document.getElementById('global-modal-icon');
    const modalContent = modal.querySelector('.modal-content');

    // 1. Set nội dung
    titleEl.innerText = title;
    msgEl.innerHTML = message.replace(/\n/g, '<br>'); // Hỗ trợ xuống dòng
    actionsEl.innerHTML = ''; // Xóa nút cũ

    // 2. Set Icon & Màu tiêu đề tùy loại
    if (type === 'danger') {
        iconEl.innerHTML = `<svg class="w-16 h-16 mx-auto mb-2 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
        titleEl.className = "text-2xl font-black title-font text-red-500 mb-2";
    } else if (type === 'confirm') {
        iconEl.innerHTML = `<svg class="w-16 h-16 mx-auto mb-2 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        titleEl.className = "text-2xl font-black title-font text-yellow-400 mb-2";
    } else {
        iconEl.innerHTML = `<svg class="w-16 h-16 mx-auto mb-2 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        titleEl.className = "text-2xl font-black title-font text-cyan-400 mb-2";
    }

    // 3. Tạo nút bấm
    if (type === 'confirm' || type === 'danger') {
        // Nút Hủy
        const btnCancel = document.createElement('button');
        btnCancel.className = "text-gray-400 hover:text-white font-bold text-sm px-4 py-2 transition";
        btnCancel.innerText = "HỦY BỎ";
        btnCancel.onclick = () => modal.classList.remove('active');
        actionsEl.appendChild(btnCancel);

        // Nút Đồng ý
        const btnOk = document.createElement('button');
        btnOk.className = type === 'danger'
            ? "bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-red-900/50 transition"
            : "cyber-btn px-6 py-2 rounded-lg font-bold text-sm text-white transition";

        btnOk.innerText = type === 'danger' ? "XÓA NGAY" : "ĐỒNG Ý";

        btnOk.onclick = async () => {
            modal.classList.remove('active');
            if (onConfirm) await onConfirm();
        };
        actionsEl.appendChild(btnOk);
    } else {
        // Chỉ hiện nút Đóng (Info/Alert)
        const btnClose = document.createElement('button');
        btnClose.className = "cyber-btn px-8 py-2 rounded-lg font-bold text-sm text-white";
        btnClose.innerText = "ĐÃ HIỂU";
        btnClose.onclick = () => modal.classList.remove('active');
        actionsEl.appendChild(btnClose);
    }

    if (type === 'info') {
        modalContent.classList.add('is-news');
    } else {
        modalContent.classList.remove('is-news');
    }

    // 4. Hiện Modal
    modal.classList.add('active');
}

// ==========================================
// 2. GLOBAL HANDLERS (Gắn vào Window để HTML gọi được)
// ==========================================

// --- Tiện ích ---
window.copyServerIP = () => {
    navigator.clipboard.writeText("cornmc.vn").then(() => {
        showCustomModal("SERVER IP", "Đã copy IP thành công:\n cornmc.vn \n PC: play.cornmc.vn \n PE: pe.cornmc.vn port 26700", "info");
    });
};

window.openDiscord = () => {
    window.open("https://discord.gg/cUsA2K4Cpz", "_blank");
};

// --- Chức năng Admin: Quản lý User ---
window.handleRoleChange = async (uid, newRole) => {
    showCustomModal(
        "XÁC NHẬN PHÂN QUYỀN",
        `Bạn có chắc muốn đổi quyền thành viên này sang [${newRole.toUpperCase()}]?`,
        "confirm",
        async () => {
            try {
                await editDocument('users', uid, { role: newRole });
                showCustomModal("THÀNH CÔNG", "Đã cập nhật quyền thành công!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.handleDeleteUser = async (uid, name) => {
    showCustomModal(
        "CẢNH BÁO XÓA USER",
        ` Bạn đang xóa toàn bộ dữ liệu của [${name}]?\nHành động này KHÔNG THỂ khôi phục!`,
        "danger",
        async () => {
            try {
                await deleteUserAndData(uid);
                renderAdminTable();
                showCustomModal("THÀNH CÔNG", "Đã xóa thành viên!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.deletePost = (collectionName, docId) => {
    showCustomModal(
        "XÓA BÀI VIẾT",
        "Bạn chắc chắn muốn xóa bài viết này vĩnh viễn?",
        "danger",
        async () => {
            try {
                await deleteDocument(collectionName, docId);
                // Load lại trang tương ứng
                if (collectionName === 'news') renderNews();
                if (collectionName === 'guides') renderGuides();
                if (collectionName === 'forum_posts') {
                    const isPending = document.getElementById('tab-pending')?.classList.contains('active');
                    renderForum(isPending ? 'pending' : 'approved');
                }
                showCustomModal("THÔNG BÁO", "Đã xóa bài viết.", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.approvePost = (docId) => {
    showCustomModal(
        "DUYỆT BÀI",
        "Bạn muốn duyệt bài viết này hiển thị công khai?",
        "confirm",
        async () => {
            try {
                await editDocument('forum_posts', docId, { status: 'approved' });
                renderForum('pending');
                showCustomModal("THÀNH CÔNG", "Đã duyệt bài!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

// Hàm hiển thị Modal tải MC PE
window.showMcPeModal = () => {
    const linkDrive = "https://drive.google.com/file/d/1Q-SBCm5FcK8a9q_7WE3bwV5RKavStbXR/view?usp=sharing";

    const htmlContent = `
        <div class="space-y-4 text-center mt-4">
            <p class="text-gray-300 text-sm">Phiên bản Minecraft PE đã được tối ưu cho máy chủ <b>CornMC</b>.</p>
            
            <div class="glass-panel p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                <p class="text-xs text-cyan-400 mb-2">Thông tin file:</p>
                <ul class="text-[11px] text-gray-400 text-left list-disc list-inside">
                    <li>Dung lượng: ~450MB</li>
                    <li>Phiên bản: 1.21.60 (Latest)</li>
                    <li>Hỗ trợ: Android (apk)</li>
                </ul>
            </div>
            <a href="${linkDrive}" target="_blank">
                <span>TẢI XUỐNG NGAY</span>
                <span class="text-xl animate-bounce">⬇️</span>
            </a>
            
        </div>
    `;

    // Gọi hàm Modal có sẵn
    window.showCustomModal("TẢI MINECRAFT PE", htmlContent, "info");
};

// --- Chức năng Diễn đàn ---
window.filterForum = (status) => {
    const btnApproved = document.getElementById('tab-approved');
    const btnPending = document.getElementById('tab-pending');
    const btnMine = document.getElementById('tab-mine');

    [btnApproved, btnPending, btnMine].forEach(btn => {
        if (btn) btn.className = "px-5 py-2 rounded-lg font-bold text-sm transition border border-gray-700 text-gray-400 hover:bg-white/5";
    });

    if (status === 'approved' && btnApproved) {
        btnApproved.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)] border border-cyan-400";
    } else if (status === 'pending' && btnPending) {
        btnPending.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-yellow-600 text-white shadow-[0_0_10px_rgba(202,138,4,0.5)] border border-yellow-400";
    } else if (status === 'mine' && btnMine) {
        btnMine.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] border border-purple-400";
    }
    renderForum(status);
};

window.toggleComments = (postId) => {
    const section = document.getElementById(`comments-section-${postId}`);
    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden')) {
        renderComments(postId);
    }
};

window.sendComment = async (postId) => {
    if (!currentUser) return showCustomModal("YÊU CẦU", "Vui lòng đăng nhập để bình luận!", "info");
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();

    if (!content) return;

    try {
        await addComment(postId, content, currentRole);
        input.value = '';
        renderComments(postId);
    } catch (e) { showCustomModal("LỖI", "Gửi comment thất bại: " + e.message, "danger"); }
};

window.deleteCommentAction = (postId, commentId) => {
    showCustomModal(
        "XÓA BÌNH LUẬN",
        "Bạn muốn xóa bình luận này?",
        "danger",
        async () => {
            try {
                await deleteComment(postId, commentId);
                renderComments(postId);
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

// ==========================================
// RENDER NEWS 
// ==========================================
async function renderNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    const news = await fetchNews();
    const isStaff = ['admin', 'dev'].includes(currentRole);

    if (news.length === 0) {
        container.innerHTML = `<div class="glass-panel p-6 text-center text-gray-400">Chưa có tin tức nào.</div>`;
        return;
    }

    container.innerHTML = news.map(item => {
        // Xử lý dữ liệu an toàn để đưa vào Modal
        const safeTitle = (item.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        // Nếu có hình ảnh, tự động chèn thẻ img vào đầu nội dung khi hiển thị trong Modal
        let modalContent = item.content || '';
        if (item.imageUrl) {
            modalContent = `<img src="${item.imageUrl}" class="w-full h-auto rounded-lg mb-4 border border-cyan-500/30 shadow-lg"><br>` + modalContent;
        }
        const safeContent = modalContent.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '<br>');

        // Lấy 1 đoạn text ngắn bỏ hết HTML để làm mô tả
        const plainTextDesc = (item.content || '').replace(/<[^>]*>?/gm, '');

        return `
    <div class="glass-panel p-5 rounded-xl forum-post mb-4 border-l-4 border-cyan-500 bg-gradient-to-r from-white/10 to-transparent hover:bg-white/15 transition cursor-pointer group shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
         onclick="window.showCustomModal('${safeTitle}', '${safeContent}', 'info')">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div class="flex-1 min-w-0"> 
                <div class="flex items-center space-x-3 mb-2">
                    <span class="text-xs text-white bg-purple-600/40 border border-purple-400/30 px-2 rounded shadow-sm">${new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    <span class="bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">${item.category || 'TIN TỨC'}</span>
                </div>
                
                <h3 class="text-xl font-bold title-font text-cyan-100 drop-shadow-md group-hover:text-white transition">${item.title}</h3>
                
                <p class="text-gray-400 text-sm mt-1 line-clamp-2">${plainTextDesc}</p>
            </div>

            <div class="flex flex-col items-end gap-2 flex-shrink-0 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 w-full sm:w-auto">
                <span class="text-xs text-gray-400 hidden sm:block">Bởi: <b class="text-cyan-300">${item.author}</b></span>
                <span class="text-cyan-400 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">ĐỌC CHI TIẾT ➔</span>
                
                ${isStaff ? `<button onclick="event.stopPropagation(); window.deletePost('news', '${item.id}')" class="text-red-400 text-xs hover:text-white font-bold bg-red-900/30 hover:bg-red-600 px-3 py-1.5 rounded border border-red-500/30 mt-1 transition shadow-md inline-flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>XÓA</button>` : ''}
            </div>
        </div>
    </div>
    `}).join('');
}


// ==========================================
// RENDER PLAYER GUIDES (2 CỘT: LỆNH & LUẬT - DẠNG XỔ XUỐNG)
// ==========================================
async function renderGuides() {
    const container = document.getElementById('guide-container');
    if (!container) return;

    // ==========================================
    // 1. DỮ LIỆU BÊN TRÁI: DANH SÁCH LỆNH (COMMANDS)
    // ==========================================
    const commandsData = [
        {
            title: "🌍 Di Chuyển & Dịch Chuyển",
            commands: [
                { cmd: "/spawn", desc: "Dịch chuyển về điểm spawn", color: "yellow" },
                { cmd: "/home <tên>", desc: "Dịch chuyển về nhà", color: "yellow" },
                { cmd: "/sethome <tên>", desc: "Đặt vị trí nhà", color: "yellow" },
                { cmd: "/delhome <tên>", desc: "Xóa nhà", color: "red" },
                { cmd: "/warp <tên>", desc: "Dịch chuyển đến warp", color: "yellow" },
                { cmd: "/rtp", desc: "Dịch chuyển ngẫu nhiên", color: "yellow" },
                { cmd: "/back", desc: "Quay về chỗ chết hoặc vị trí cũ", color: "yellow" }
            ]
        },
        {
            title: "👥 Tương Tác Người Chơi",
            commands: [
                { cmd: "/tpa <tên>", desc: "Gửi yêu cầu dịch chuyển", color: "green" },
                { cmd: "/tpaccept", desc: "Chấp nhận yêu cầu", color: "green" },
                { cmd: "/tpdeny", desc: "Từ chối yêu cầu", color: "red" },
                { cmd: "/msg, /w, /tell <tên>", desc: "Nhắn tin riêng", color: "blue" },
                { cmd: "/pay <tên> <tiền>", desc: "Chuyển tiền cho người khác", color: "purple" },
                { cmd: "/points pay <tên> <xu>", desc: "Chuyển xu cho người khác", color: "purple" }
            ]
        },
        {
            title: "💰 Kinh Tế & Mua Bán",
            commands: [
                { cmd: "/balance, /bal", desc: "Xem số tiền bạn có", color: "yellow" },
                { cmd: "/ah", desc: "Mở chợ đấu giá cộng đồng", color: "orange" },
                { cmd: "/ah sell <giá>", desc: "Bán vật phẩm đang cầm", color: "orange" },
                { cmd: "/shop", desc: "Mở cửa hàng hệ thống", color: "blue" },
                { cmd: "/sellgui", desc: "Mở Menu bán đồ nhanh", color: "blue" },
                { cmd: "/sellall <tên>", desc: "Bán tất cả 1 loại đồ", color: "blue" },
                { cmd: "/rank", desc: "Xem menu mua Rank VIP", color: "cyan" }
            ]
        },
        {
            title: "🛡️ Bảo Vệ Đất (Claim)",
            videoLink: "https://streamable.com/oym4xe",
            commands: [
                { cmd: "/claim", desc: "Tạo vùng bảo vệ (Cần Golden Shovel)", color: "yellow" },
                { cmd: "/claimshop", desc: "Mua thêm Claimblocks", color: "yellow" },
                { cmd: "/unclaim", desc: "Bỏ vùng đất đang đứng", color: "red" },
                { cmd: "/trust <tên>", desc: "Cho phép người khác xây dựng", color: "green" },
                { cmd: "/untrust <tên>", desc: "Thu hồi quyền xây dựng", color: "red" },
                { cmd: "/trustlist", desc: "Xem danh sách người có quyền", color: "cyan" },
                { cmd: "/claimslist", desc: "Xem các vùng bạn đang sở hữu", color: "cyan" }
            ]
        },
        {
            title: "⚙️ Tiện Ích & Biểu Cảm",
            colSpan: true,
            commands: [
                { cmd: "/pv <số>", desc: "Mở kho chứa đồ ảo", color: "purple" },
                { cmd: "/repair", desc: "Sửa vật phẩm đang cầm", color: "purple" },
                { cmd: "/diemdanh", desc: "Nhận thưởng điểm danh hằng ngày", color: "purple" },
                { cmd: "[i]", desc: "Gõ trong chat để show đồ đang cầm", color: "white" },
                { cmd: "[inv]", desc: "Hiển thị toàn bộ kho đồ lên chat", color: "white" },
                { cmd: "/sit", desc: "Ngồi xuống tại chỗ", color: "pink" },
                { cmd: "/lay", desc: "Nằm xuống mặt đất", color: "pink" },
                { cmd: "/crawl", desc: "Bò trườn", color: "pink" },
                { cmd: "/spin", desc: "Xoay vòng vòng", color: "pink" }
            ]
        },
        {
            title: "💼 Hệ Thống Nghề Nghiệp (Jobs)",
            commands: [
                { cmd: "/jobs join <Tên>", desc: "Tham gia nghề (VD: /jobs join Miner)", color: "green" },
                { cmd: "/jobs leave <Tên>", desc: "Rời khỏi nghề hiện tại", color: "red" },
                { cmd: "/jobs browse", desc: "Xem danh sách và lương từng nghề", color: "cyan" },
                { cmd: "/jobs stats", desc: "Xem cấp độ nghề của bản thân", color: "yellow" }
            ],
            showJobsList: true
        },
        {
            title: "📊 Hệ Thống Thông Tin & Chat",
            commands: [
                { cmd: "/bangthongtin", desc: "Bật/Tắt bảng thông tin bên phải màn hình", color: "cyan" },
                { cmd: "/taixiu toggle", desc: "Ẩn hoặc hiện các thông báo Tài Xỉu", color: "orange" },
                { cmd: "/chatgame toggle", desc: "Ẩn hoặc hiện các thông báo Minigame", color: "green" },
                { cmd: "/chattoggle", desc: "Tắt hoàn toàn chat từ người chơi khác", color: "red" }
            ]
        },
    ];

    const jobsCategories = [
        {
            title: "⚗️ Nhóm Chế Tạo & Phép Thuật",
            color: "purple",
            jobs: [
                { en: "Alchemist", vi: "Nhà Giả Kim" },
                { en: "Enchanter", vi: "Người Phù Phép" },
                { en: "Crafter", vi: "Thợ Chế Tạo" },
                { en: "Smelter", vi: "Thợ Luyện Kim" }
            ]
        },
        {
            title: "⚒️ Nhóm Xây Dựng & Khai Thác",
            color: "cyan",
            jobs: [
                { en: "Builder", vi: "Thợ Xây Dựng" },
                { en: "Blacksmith", vi: "Thợ Rèn" },
                { en: "Miner", vi: "Thợ Mỏ" },
                { en: "Demolitionist", vi: "Chuyên Gia Phá Dỡ" },
                { en: "Lumberjack", vi: "Tiều Phu" }
            ]
        },
        {
            title: "🌾 Nhóm Nông Nghiệp & Chăn Nuôi",
            color: "green",
            jobs: [
                { en: "Farmer", vi: "Nông Dân" },
                { en: "Breeder", vi: "Người Chăn Nuôi" },
                { en: "Shepherd", vi: "Người Chăn Cừu" }
            ]
        },
        {
            title: "🏹 Nhóm Sinh Tồn & Khám Phá",
            color: "red",
            jobs: [
                { en: "Hunter", vi: "Thợ Săn" },
                { en: "Fisherman", vi: "Ngư Dân" },
                { en: "Explorer", vi: "Nhà Thám Hiểm" },
                { en: "Tamer", vi: "Người Thuần Hóa" }
            ]
        },
        {
            title: "🎨 Nhóm Thủ Công & Khác",
            color: "orange",
            jobs: [
                { en: "Dyer", vi: "Thợ Nhuộm" },
                { en: "Brusher", vi: "Người Cọ Rửa" },
                { en: "Griller", vi: "Người Nướng" },
                { en: "Gourmet", vi: "Người Sành Ăn" },
                { en: "Trader", vi: "Thương Nhân" }
            ]
        }
    ];

    const rulesData = [
        {
            title: "🚫 1. Hack/Cheat & Lợi Dụng Lỗi",
            rules: [
                "Được dùng Autoclick cơ bản (spam đánh theo delay) & Freecam (chỉ để xây dựng/quan sát). Cấm dùng macro ngoài game (AutoHotKey, Razer...) để lách luật.",
                "Cấm tuyệt đối mọi loại Hack/Cheat, X-ray, KillAura, Aimbot, Ghost Client hoặc mod ẩn (stealth mode).",
                "Cấm dùng Litematica khi chưa báo Admin. Cấm mọi hành vi dupe item/block.",
                "Cấm trục lợi từ bug game/plugin. Phát hiện lỗi phải báo BQT ngay, giấu giếm sẽ bị Ban vĩnh viễn."
            ]
        },
        {
            title: "⚔️ 2. Gameplay & PvP",
            rules: [
                "PvP ngoài safezone chỉ hợp lệ khi 2 bên tự nguyện. Không kill người trong safezone, spawn.",
                "Cấm phá hoại (Griefing) công trình người khác bằng lava, nước, TNT, hoặc spam entity/hopper gây lag.",
                "Cấm ăn cắp đồ, cấm lợi dụng quyền trust/nhờ mượn đồ để chiếm đoạt (Xử lý theo log).",
                "Cấm trap/bait người chơi để giết lấy đồ (bao gồm AFK trap).",
                "Cấm dùng nhiều tài khoản (clone/alt) để lấy kit, vote, event hoặc treo AFK farm."
            ]
        },
        {
            title: "🏡 3. Xây Dựng Farm & Base",
            rules: [
                "Xây dựng tự do, nhưng CẤM xây lag machine, redstone clock làm giảm TPS server.",
                "Nếu farm gây lag (Staff đo bằng TPS/Spark), phải tắt ngay khi được nhắc nhở. Cố tình tái phạm sẽ bị xóa farm không báo trước.",
                "Cấm xây công trình phản cảm, 18+, phân biệt chủng tộc hoặc liên quan đến chính trị.",
                "Server không đảm bảo đền bù/restore mọi trường hợp; chỉ xem xét khi có log rõ ràng."
            ]
        },
        {
            title: "🛡️ 4. Hành Xử Với BQT (Staff/Admin)",
            rules: [
                "Tôn trọng người chơi và BQT. Không xúc phạm, cãi vã hay gây rối.",
                "Không năn nỉ xin quyền OP, Fly, Creative, xin items hoặc hối lộ BQT.",
                "Cấm chụp/cắt ghép log, ảnh giả để bôi nhọ Staff.",
                "Nghi ngờ Staff lạm quyền? Hãy khiếu nại lên Owner kèm bằng chứng (ảnh, log, video)."
            ]
        },
        {
            title: "💸 5. Giao Dịch & Mua Bán",
            rules: [
                "Chỉ giao dịch bằng tiền tệ/vật phẩm IN-GAME. Cấm giao dịch bằng tiền thật (VNĐ/Tiền ảo). Vi phạm Ban vĩnh viễn.",
                "Cấm giao dịch liên server, qua trung gian ngoài hệ thống, hoặc lập chợ đen.",
                "Cấm trade giftcode/thẻ cào giữa người chơi (Chỉ được Donate trực tiếp).",
                "Cấm Scam (lừa đảo). Cấm bán slot top, thuê cày hộ."
            ]
        },
        {
            title: "🔐 6. Quyền Riêng Tư & Bảo Mật",
            rules: [
                "Không chia sẻ tài khoản. Tự chịu trách nhiệm nếu người dùng chung acc vi phạm luật.",
                "Bị hack hoặc quên mật khẩu: Báo ngay cho Admin kèm thông tin chứng minh để khôi phục.",
                "Cấm chia sẻ/đe dọa công khai thông tin cá nhân của người khác (Doxxing).",
                "Cấm phát tán hình ảnh, tin nhắn riêng tư khi chưa được cho phép."
            ]
        },
        {
            title: "💬 7. Kênh Chat & Discord",
            rules: [
                "Không spam tin nhắn, spam lệnh, tag BQT vô cớ. Mở Ticket xong phải đóng.",
                "Không chửi bới, phân biệt vùng miền, tôn giáo, chính trị, gửi nội dung 18+.",
                "Cấm nhắc tên/IP server khác. Cấm gửi link ngoài, link rút gọn, file chứa mã độc.",
                "Cấm lách filter chat (VD: h@ck). Cấm spam đổi tên, spam emoji, spam join/leave voice.",
                "Phải vào Discord/Box để cập nhật thông báo. Không giải quyết nếu bạn bỏ lỡ thông báo server."
            ]
        },
        {
            title: "🎭 8. Mạo Danh & Quảng Cáo",
            rules: [
                "Cấm giả mạo BQT hoặc người chơi khác để lừa đảo.",
                "Cấm quảng cáo server ngoài, hack/cheat hoặc dịch vụ cày thuê.",
                "Cấm lôi kéo người chơi sang group khác hoặc DM nhắn tin rác qua Discord."
            ]
        },
        {
            title: "🏆 9. Event & Đua Top",
            rules: [
                "Mỗi người CHỈ dùng 1 tài khoản chính tham gia event.",
                "Cấm dùng acc clone để buff, giữ đồ, farm phụ, chuyển tài nguyên... tính là vi phạm.",
                "Cấm lợi dụng bug/hack hoặc thuê người cày top. Vi phạm tước quyền và phạt nặng."
            ]
        },
        {
            title: "⚖️ 10. Hệ Thống Hình Phạt",
            rules: [
                "Mức độ: Cảnh cáo/Mute/Jail ➔ Ban 1/3/7/45 ngày ➔ Ban Vĩnh Viễn.",
                "Phạt song song (MC & Discord). Lách luật bằng alt bị phạt Gấp Đôi.",
                "Lần đầu: Ban Acc (Được tạo acc mới chơi lại nhưng cấm nhận quà tân thủ/event).",
                "Tạo acc mới để tiếp tục phá/hack: BAN IP VÀ HARDWARE toàn bộ tài khoản.",
                "Staff có quyền xử lý các hành vi phá hoại chưa có trong luật. Chơi là mặc định đồng ý luật, không chấp nhận lý do 'Chưa đọc luật'!"
            ]
        }
    ];

    const colorMap = {
        "yellow": "text-yellow-400 border-yellow-500/30",
        "red": "text-red-400 border-red-500/30",
        "green": "text-green-400 border-green-500/30",
        "blue": "text-blue-400 border-blue-500/30",
        "purple": "text-purple-400 border-purple-500/30",
        "orange": "text-orange-400 border-orange-500/30",
        "cyan": "text-cyan-400 border-cyan-500/30",
        "white": "text-white border-gray-500/30"
    };

    // ==========================================
    // 3. TẠO HTML CHO CỘT LỆNH
    // ==========================================
    let commandsHtml = `
        <div class="space-y-4">
            <h3 class="text-3xl font-black title-font text-cyan-400 mb-6 border-b border-cyan-500/30 pb-3">📚 LỆNH CƠ BẢN</h3>
            ${commandsData.map(group => `
                <div class="glass-panel rounded-2xl border border-purple-500/30 overflow-hidden mb-3">
                    <div class="p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition group"
                        onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.toggle-icon').classList.toggle('rotate-180');">
                        <h4 class="font-bold text-white title-font group-hover:text-cyan-300 transition-colors">${group.title}</h4>
                        <span class="toggle-icon text-cyan-400 font-bold transition-transform duration-300 text-xs">▼</span>
                    </div>
                    
                    <div class="hidden p-4 border-t border-white/5 bg-black/40 space-y-4">
                        <div class="space-y-2">
                            ${group.commands.map(cmd => `
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-1">
                                    <code class="${colorMap[cmd.color]} bg-black/50 px-2 py-0.5 rounded font-mono text-xs border border-white/5">${cmd.cmd}</code>
                                    <span class="text-gray-400 text-[11px]">${cmd.desc}</span>
                                </div>
                            `).join('')}
                        </div>

                        ${group.showJobsList ? `
                            <div class="mt-4 pt-4 border-t border-white/10">
                                <p class="text-[10px] text-orange-300 mb-3 italic">Bảng tra cứu tên nghề (Sử dụng cho lệnh /jobs join):</p>
                                <div class="grid grid-cols-1 gap-4">
                                    ${jobsCategories.map(cat => `
                                        <div class="bg-white/5 p-2 rounded-lg border border-white/5">
                                            <div class="text-[11px] font-bold text-cyan-400 mb-2 uppercase tracking-wider">${cat.title}</div>
                                            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                                                ${cat.jobs.map(j => `
                                                    <div class="flex items-center justify-between text-[10px]">
                                                        <span class="text-white font-mono font-bold">${j.en}</span>
                                                        <span class="text-gray-500">→ ${j.vi}</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // ==========================================
    // 4. TẠO HTML CHO CỘT LUẬT
    // ==========================================
    let rulesHtml = `
        <div class="space-y-4 mt-12 lg:mt-0">
            <h3 class="text-3xl font-black title-font text-red-400 mb-6 flex items-center gap-3 border-b border-red-500/30 pb-3">
                <span class="text-4xl">⚖️</span> LUẬT MÁY CHỦ
            </h3>
            ${rulesData.map(group => `
                <div class="glass-panel rounded-2xl border border-red-500/30 overflow-hidden shadow-[0_0_15px_rgba(248,113,113,0.1)]">
                    <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition select-none group"
                         onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.toggle-icon').classList.toggle('rotate-180');">
                        <h4 class="text-xl font-bold text-red-100 title-font group-hover:text-red-300 transition-colors">${group.title}</h4>
                        <span class="toggle-icon text-red-400 font-bold transition-transform duration-300">▼</span>
                    </div>
                    
                    <div class="hidden p-5 border-t border-red-500/10 bg-red-950/20 space-y-3">
                        ${group.rules.map(rule => `
                            <div class="flex items-start gap-3">
                                <span class="text-red-500 mt-0.5 text-lg">▪</span>
                                <span class="text-gray-200 text-sm leading-relaxed">${rule}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // ==========================================
    // 5. GỘP CẢ 2 CỘT VÀ IN RA MÀN HÌNH
    // ==========================================
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            ${commandsHtml}
            ${rulesHtml}
        </div>
    `;

    // Gỡ class 'grid-cols-1 md:grid-cols-2' cũ của container ngoài HTML để tránh bị lồng grid
    container.className = "";
}

// ==========================================
// RENDER STAFF (ĐỘI NGŨ BAN QUẢN TRỊ)
// ==========================================
async function renderStaff() {
    // Đảm bảo bạn có thẻ <div id="staff-container"></div> bên trong HTML
    const container = document.getElementById('staff-container');
    if (!container) return;

    // Hiển thị hiệu ứng loading
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="loader-ring w-12 h-12 mx-auto mb-4"></div>
            <p class="text-cyan-400 font-bold neon-text animate-pulse">Đang tải danh sách đội ngũ...</p>
        </div>`;

    try {
        // Lấy dữ liệu từ core.js
        const staffList = await fetchStaffMembers();

        if (!staffList || staffList.length === 0) {
            container.innerHTML = `<div class="glass-panel p-6 text-center text-gray-400 italic rounded-xl border border-dashed border-gray-700">Chưa có thông tin Ban Quản Trị.</div>`;
            return;
        }

        // Định nghĩa màu sắc & nhãn hiển thị cho từng Role
        const roleConfig = {
            'admin': {
                name: 'Admin',
                icon: `<svg class="w-4 h-4 inline-block align-text-bottom mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
                color: 'text-red-400',
                border: 'border-red-500/50',
                bg: 'bg-red-500/10 shadow-[0_0_15px_rgba(248,113,113,0.2)]'
            },
            'dev': {
                name: 'Developer',
                icon: `<svg class="w-4 h-4 inline-block align-text-bottom mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`,
                color: 'text-yellow-400',
                border: 'border-yellow-500/50',
                bg: 'bg-yellow-500/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
            },
            'staff': {
                name: 'Staff',
                icon: `<svg class="w-4 h-4 inline-block align-text-bottom mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"></path></svg>`,
                color: 'text-purple-400',
                border: 'border-purple-500/50',
                bg: 'bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
            },
            'media': {
                name: 'Media',
                icon: `<svg class="w-4 h-4 inline-block align-text-bottom mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`,
                color: 'text-pink-400',
                border: 'border-pink-500/50',
                bg: 'bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
            },
            'helper': {
                name: 'Helper',
                icon: `<svg class="w-4 h-4 inline-block align-text-bottom mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
                color: 'text-green-400',
                border: 'border-green-500/50',
                bg: 'bg-green-500/10 shadow-[0_0_15px_rgba(74,222,128,0.2)]'
            }
        };

        // Ưu tiên sắp xếp (Admin hiện trước -> Dev -> Staff -> Media -> Helper)
        const rolePriority = { 'admin': 1, 'dev': 2, 'staff': 3, 'media': 4, 'helper': 5 };
        staffList.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));

        const html = staffList.map(staff => {
            const avatar = staff.photoURL || `https://mc-heads.net/avatar/${staff.username || 'Steve'}`;
            const conf = roleConfig[staff.role] || { name: staff.role.toUpperCase(), icon: '👤', color: 'text-gray-400', border: 'border-gray-500/50', bg: 'bg-gray-500/10' };

            // Xử lý link mạng xã hội (Discord & Tự động nhận diện Website/FB/YT/TikTok)
            let socialsHtml = '';
            if (staff.discordLink || staff.websiteLink) {
                
                // 1. Nút Discord (Đã thay bằng Icon Logo thật)
                if (staff.discordLink) {
                    const isId = /^\d+$/.test(staff.discordLink);
                    const link = isId ? `https://discordapp.com/users/${staff.discordLink}` : staff.discordLink;
                    socialsHtml += `
                    <a href="${link}" target="_blank" class="px-3 py-1.5 rounded bg-[#5865F2]/20 hover:bg-[#5865F2]/40 text-[#5865F2] hover:text-white border border-[#5865F2]/30 transition text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>Discord
                    </a>`;
                }
                
                // 2. Nút MXH tự động nhận diện (Web / Facebook / YouTube / TikTok)
                if (staff.websiteLink) {
                    let link = staff.websiteLink.toLowerCase();
                    let pName = "Website";
                    let pColor = "text-cyan-400 border-cyan-500/30 bg-cyan-500/20 hover:bg-cyan-500/40";
                    let pIcon = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>`;
                    
                    if (link.includes("facebook.com") || link.includes("fb.com") || link.includes("fb.watch")) {
                        pName = "Facebook";
                        pColor = "text-blue-400 border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/40";
                        pIcon = `<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>`;
                    } else if (link.includes("youtube.com") || link.includes("youtu.be")) {
                        pName = "YouTube";
                        pColor = "text-red-400 border-red-500/30 bg-red-600/20 hover:bg-red-600/40";
                        pIcon = `<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>`;
                    } else if (link.includes("tiktok.com")) {
                        pName = "TikTok";
                        pColor = "text-gray-300 border-gray-500/30 bg-gray-600/20 hover:bg-gray-600/40 hover:border-pink-500/50 hover:text-white";
                        pIcon = `<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.44-3.17-3.64-5.46-.22-2.15.53-4.32 2.05-5.83 1.57-1.54 3.86-2.16 6.01-1.67V13.8c-1.05-.2-2.14-.07-3.08.43-.88.45-1.52 1.3-1.66 2.29-.14 1.05.21 2.13.92 2.87.72.76 1.79 1.15 2.85 1.04 1.25-.13 2.37-1.02 2.66-2.24.12-.47.16-.96.16-1.44V.02z"/></svg>`;
                    }

                    socialsHtml += `
                    <a href="${staff.websiteLink}" target="_blank" class="px-3 py-1.5 rounded ${pColor} hover:text-white transition text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                        ${pIcon}${pName}
                    </a>`;
                }
            } else {
                socialsHtml = `<span class="text-gray-600 text-[10px] italic mt-1">Chưa liên kết MXH</span>`;
            }

            return `
            <div class="glass-panel p-6 rounded-2xl flex flex-col items-center border-t-4 ${conf.border} ${conf.bg} hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group">
                <div class="relative">
                    <img src="${avatar}" alt="${staff.username}" class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mb-4 border-2 ${conf.border} shadow-lg object-cover bg-gray-900 group-hover:shadow-[0_0_20px_currentColor] transition-all">
                    <span class="absolute -bottom-2 -right-2 text-2xl drop-shadow-md bg-black/50 rounded-full w-8 h-8 flex items-center justify-center">${conf.icon}</span>
                </div>
                
                <h4 class="text-xl sm:text-2xl font-black text-white title-font drop-shadow-md text-center line-clamp-1 w-full">${staff.username || 'Ẩn danh'}</h4>
                
                <span class="inline-block px-4 py-1 mt-2 rounded-full text-xs sm:text-sm font-bold tracking-widest uppercase border ${conf.border} ${conf.color} bg-black/40">
                    ${conf.name}
                </span>
                
                <div class="mt-5 pt-4 w-full flex justify-center gap-2 border-t border-white/5">
                    ${socialsHtml}
                </div>
            </div>
            `;
        }).join('');

        // In ra giao diện (Chia cột: Mobile 2 cột, PC 3-4 cột)
        container.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">${html}</div>`;

    } catch (error) {
        console.error("Lỗi khi renderStaff:", error);
        container.innerHTML = `<div class="text-red-500 text-center glass-panel p-6 border border-red-500/30 rounded-xl shadow-[0_0_15px_rgba(248,113,113,0.1)]"> Có lỗi xảy ra khi tải danh sách BQT. Hãy thử lại sau!</div>`;
    }
}

async function renderRanking() {
    const container = document.getElementById('ranking-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-12"><div class="loader-ring w-12 h-12 mx-auto mb-4"></div><p class="text-cyan-400 font-bold neon-text animate-pulse">Đang tải dữ liệu từ máy chủ...</p></div>';

    const CURRENT_ID = "i7E2VpkoiVLVXYSE";
    const BASE_ID = "sqmvh6RVOlyyDNYC";

    try {
        const [resCurrent, resBase] = await Promise.all([
            fetch(`https://bytebin.ajg0702.us/${CURRENT_ID}`),
            fetch(`https://bytebin.ajg0702.us/${BASE_ID}`)
        ]);


        const dataCurrent = await resCurrent.json();
        const data = await resBase.json();

        // 1. LẤY DỮ LIỆU ĐỘNG TỪ API VÀ SẮP XẾP
        const moneyBoard = (data["vault_eco_balance"] || []).sort((a, b) => (b.value || 0) - (a.value || 0));
        const currentOnlineRaw = dataCurrent["statistic_time_played"] || [];
        const baseOnlineRaw = data["statistic_time_played"] || []; 
        

        const onlineBoard = currentOnlineRaw.map(player => {
            // Tìm người chơi này trong dữ liệu mốc (Base)
            const basePlayer = baseOnlineRaw.find(b => b.namecache === player.namecache);

            const currentTime = parseFloat(player.value || 0); // Giá trị hiện tại (Lớn)
            const baseTime = basePlayer ? parseFloat(basePlayer.value || 0) : 0; // Giá trị mốc (Nhỏ)

            // Tính toán: Base - Current
            let result = baseTime - currentTime;

            if (player.namecache === "WolfMC") {
                result = result - 600000;
                if (result < 0) result = 0; // Đảm bảo thời gian không bị rớt xuống âm
            }

            //let result = baseTime;
            return {
                ...player,
                // Dùng Math.abs để đảm bảo con số hiển thị là số dương cho bảng xếp hạng
                value: Math.abs(result)
            };
        }).sort((a, b) => b.value - a.value);

        const pointBoard = (data["playerpoints_points"] || []).sort((a, b) => (b.value || 0) - (a.value || 0));
        const killBoard = (data["statistic_player_kills"] || []).sort((a, b) => (b.value || 0) - (a.value || 0));

        // 2. DỮ LIỆU TOP DONATE (Nhập thủ công)
        const donateData = [
            // --- DANH SÁCH CŨ (Đã cộng dồn tiền mới nếu có) ---
            { namecache: "Glenn1", value: 2700000 },
            { namecache: "PE_Dellcotenok", value: 2225000 },
            { namecache: "PE_PopOcean46064", value: 900000 },
            { namecache: "Timmythanh007", value: 860000 + 500000 }, // Cũ 860k + Mới 500k
            { namecache: "luan198348", value: 820000 + 800000 },
            { namecache: "Ghast", value: 500000 + 2000000 },
            { namecache: "ShaMein", value: 450000 },
            { namecache: "NgiPam_06", value: 431000 },
            { namecache: "Trungvippro", value: 420000 },
            { namecache: "LaShan", value: 200000 },
            { namecache: "PE_Mine8889672", value: 200000 },
            { namecache: "CharlesTwoK", value: 170000 },
            { namecache: "Sunnn06", value: 150000 + 50000 + 180000 + 330000 + 100000 + 725000 + 200000 + 50000 + 100000+ 230000}, 
            { namecache: "111s", value: 100000 },
            { namecache: "Haiyen01", value: 100000 + 500000 },
            { namecache: "68_Hazy", value: 100000 },
            { namecache: "Hazon1409", value: 85000 },
            { namecache: "Yuna_Gaming", value: 70000 },
            { namecache: "ScuHq", value: 50000 },
            { namecache: "PE_Huyvippto6584", value: 50000 },
            { namecache: "Kazuto207", value: 49000 },
            { namecache: "Setroit", value: 30000 },
            { namecache: "LuvHuna", value: 30000 + 20000 },
            { namecache: "lehiepmc", value: 20000 },
            { namecache: "sangvu", value: 15000 },
            { namecache: "linhcute2006", value: 1168000 + 1050000 + 25000 + 2100000 + 1000000 }, // Cũ + Mới 1M
            { namecache: "DraWind000", value: 250000 + 300000 + 900000 }, // Cũ + Mới 900k
            { namecache: "huy_holow", value: 230000 + 50000 },
            { namecache: "ConCuToBu", value: 500000 },
            { namecache: "imtrhie", value: 115000 + 36000},
            { namecache: "SenPai_Cuong", value: 420000 },
            { namecache: "saoky", value: 20000 },
            { namecache: "BkunZ", value: 10000 },
            { namecache: "Synxbao", value: 100000 },
            { namecache: "Kezuu", value: 100000 },
            { namecache: "NguoiTai0Dinh", value: 60000 },
            { namecache: "GiaHani", value: 70000 },
            { namecache: "zr0m", value: 200000 },

            // --- DANH SÁCH NHỮNG NGƯỜI DONATE MỚI HOÀN TOÀN ---
            { namecache: "KING_NTV", value: 4000000 },
            { namecache: "Rickynguyen", value: 450000 },
            { namecache: "tetinhxuan", value: 500000 },
            { namecache: "nhan", value: 350000 },
            { namecache: "Linhyumy24", value: 200000 + 50000 + 100000  + 60000},
            { namecache: "bill199204", value: 100000 + 50000 },
            { namecache: "toan909", value: 100000 },
            { namecache: "imnotlgb", value: 70000 },
            { namecache: "swipey166", value: 50000 },
            { namecache: "Hiro2003", value: 20000 },
            { namecache: "ChanhOI", value: 2000000 + 650000 + 165000 + 50000 + 625000},
            { namecache: "WolfMC", value: 40000 },
            { namecache: "Chooty_427", value: 450000 + 150000},
            { namecache: "LSArt203", value: 170000 + 20000 + 20000 },
            { namecache: "BomYeuEm", value: 20000 + 20000 },
            { namecache: "PE_Hhnoo1", value: 200000 },
            { namecache: "Zevss_Gamer", value: 300000 },
            { namecache: "zeen1207", value: 20000 },
            { namecache: "RUKY_MC", value: 20000 },
            { namecache: "huynhtri", value: 10000 },
            { namecache: "Sanganhzaki", value: 10000 + 10000 },
            { namecache: "Demon0ra", value: 60000 + 10000 },
            { namecache: "jonnyzip", value: 20000 },
            { namecache: "LuciCuc", value: 50000 },
            { namecache: "Minhvuongz", value: 20000 },
            { namecache: "NiruMi_XL", value: 25000 },
            { namecache: "samsungdang", value: 100000 + 480000 + 500000},
            { namecache: "MinzKhee", value: 200000 + 70000 },
            { namecache: "PE_Linh_chan3931", value: 240000 },
            { namecache: "VanhDuck08 ", value: 55000 + 95000 + 10000 + 500000 + 50000 + 200000 + 100000},
            { namecache: "K_PurpleReaper ", value: 100000 },
            { namecache: "SeanGeekPlayz ", value: 200000 + 350000 },
            { namecache: "Lynhnek ", value: 300000 },
            { namecache: "KarotTW ", value: 20000 },
            { namecache: "ZyraGen145 ", value: 200000 },
            { namecache: "PETERMANE ", value: 20000 },
            { namecache: "Duckman66", value: 60000 + 90000 + 100000 + 30000},
            { namecache: "Derlackvn", value: 20000},
            { namecache: "BachVjpPro1202", value: 50000},
        ];

        // Sắp xếp tự động từ cao xuống thấp
        const donateBoard = donateData.sort((a, b) => b.value - a.value);

        // ==========================================
        // 3. DỮ LIỆU TOP DONATE THÁNG 6
        // ==========================================
        const donateJuneData = [
            { namecache: "KING_NTV", value: 4000000 },
            { namecache: "ChanhOI", value: 2000000 + 650000 + 165000 + 50000 + 625000},
            { namecache: "linhcute2006", value: 1000000 },
            { namecache: "DraWind000", value: 900000 },
            { namecache: "Sunnn06", value: 725000 + 50000 + 100000+ 230000},
            { namecache: "Timmythanh007", value: 500000 },
            { namecache: "Rickynguyen", value: 450000 },
            { namecache: "Chooty_427", value: 450000 + 150000},
            { namecache: "nhan", value: 350000 },
            { namecache: "Linhyumy24", value: 200000 + 100000 + 60000},
            { namecache: "PE_Hhnoo1", value: 200000 },
            { namecache: "LSArt203", value: 170000 },
            { namecache: "bill199204", value: 100000 },
            { namecache: "toan909", value: 100000 },
            { namecache: "imnotlgb", value: 70000 },
            { namecache: "swipey166", value: 50000 },
            { namecache: "WolfMC", value: 40000 },
            { namecache: "Sanganhzaki", value: 10000 },
            { namecache: "Demon0ra", value: 60000 + 10000 },
            { namecache: "Hiro2003", value: 20000 },
            { namecache: "LuciCuc", value: 50000 },
            { namecache: "Minhvuongz", value: 20000 },
            { namecache: "NiruMi_XL", value: 25000 },
            { namecache: "samsungdang", value: 100000 + 480000 + 500000},
            { namecache: "MinzKhee", value: 200000 + 70000 },
            { namecache: "PE_Linh_chan3931", value: 240000 },
            { namecache: "VanhDuck08 ", value: 55000 + 95000 + 10000 + 500000 + 50000 + 200000 + 100000},
            { namecache: "K_PurpleReaper ", value: 100000 },
            { namecache: "SeanGeekPlayz ", value: 200000 + 350000 },
            { namecache: "Lynhnek ", value: 300000 },
            { namecache: "KarotTW ", value: 20000 },
            { namecache: "ZyraGen145 ", value: 200000 },
            { namecache: "PETERMANE ", value: 20000 },
            { namecache: "imtrhie", value: 36000},
            { namecache: "Duckman66", value: 60000 + 90000 + 100000 + 30000},
            { namecache: "Derlackvn", value: 20000},
            { namecache: "BachVjpPro1202", value: 50000},
        ];

        // Sắp xếp tự động từ cao xuống thấp
        const donateJuneBoard = donateJuneData.sort((a, b) => b.value - a.value);

        // Render ra giao diện (HTML)
        const juneContainer = document.getElementById('top-june-container');
        if (juneContainer) {
            juneContainer.innerHTML = donateJuneBoard.map((player, index) => {
                // Tạo hiệu ứng màu vàng/bạc/đồng cho Top 1, 2, 3
                let rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-normal';

                return `
                <div class="ranking-row ${rankClass}">
                    <span class="rank-number">#${index + 1}</span>
                    <span class="player-name">${player.namecache}</span>
                    <span class="player-value">${player.value.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                `;
            }).join('');
        }

        // 3. TẠO KHUNG HTML CHỨA CÁC NÚT BẤM CHUYỂN TAB
        let html = `
        <div class="flex overflow-x-auto custom-scrollbar justify-start md:justify-center gap-3 mb-8 pb-2 w-full [&>button]:shrink-0 [&>button]:whitespace-nowrap">
            <button onclick="window.switchRankTab('june')" id="tab-btn-june" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-orange-600/20 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]">TOP THÁNG 6</button>
            <button onclick="window.switchRankTab('donate')" id="tab-btn-donate" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">TOP TỔNG</button>
            <button onclick="window.switchRankTab('money')" id="tab-btn-money" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">ĐẠI GIA</button>
            <button onclick="window.switchRankTab('online')" id="tab-btn-online" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">CHĂM CHỈ</button>
            <button onclick="window.switchRankTab('point')" id="tab-btn-point" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">TOP XU</button>
            <button onclick="window.switchRankTab('kill')" id="tab-btn-kill" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">SÁT THỦ</button>
        </div>
        <div class="relative w-full max-w-2xl mx-auto">
        `;

        // Hàm hỗ trợ vẽ 1 bảng (Đã thêm formatType: 'short' hoặc 'time')
        const renderBoard = (tabId, title, boardData, prefix, suffix, colorClass, borderGlow, isHidden, limit = 10, formatType = 'none') => {
            let boardHtml = `<div id="board-${tabId}" class="rank-board ${isHidden ? 'hidden' : ''} glass-intense p-4 sm:p-6 rounded-2xl border ${borderGlow} shadow-[0_0_30px_rgba(0,0,0,0.2)] relative overflow-hidden group transition-all duration-300">`;
            boardHtml += `<div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>`;
            boardHtml += `<h3 class="text-2xl font-black title-font text-center mb-6 ${colorClass} drop-shadow-md relative z-10">${title}</h3>`;
            boardHtml += `<div class="space-y-3 relative z-10">`;

            if (boardData.length === 0) {
                boardHtml += `<div class="text-center py-8 text-gray-500 italic text-sm">Chưa có dữ liệu</div>`;
            } else {
                // Cắt danh sách theo limit truyền vào
                const topList = boardData.slice(0, limit);
                topList.forEach((player, index) => {
                    let numVal = parseFloat(player.value || 0);
                    let val = "";

                    // XỬ LÝ FORMAT HIỂN THỊ DỮ LIỆU
                    if (formatType === 'time') {
                        // Data lưu bằng Giây (Seconds)
                        let totalSeconds = Math.floor(numVal);

                        let w = Math.floor(totalSeconds / 604800); // 1 tuần = 604800 giây
                        let d = Math.floor((totalSeconds % 604800) / 86400); // 1 ngày = 86400 giây
                        let h = Math.floor((totalSeconds % 86400) / 3600); // 1 giờ = 3600 giây

                        let timeParts = [];
                        if (w > 0) timeParts.push(w + 'w');
                        if (d > 0) timeParts.push(d + 'd');
                        if (h > 0) timeParts.push(h + 'h');

                        if (timeParts.length === 0) {
                            // Nếu chưa chơi đủ 1 giờ thì tính phút hoặc giây
                            let m = Math.floor(totalSeconds / 60);
                            val = m > 0 ? m + 'm' : totalSeconds + 's';
                        } else {
                            // Cắt bớt, chỉ lấy 2 đơn vị lớn nhất cho ngắn gọn (VD: hiện "1w 2d" thay vì "1w 2d 5h")
                            val = timeParts.slice(0, 2).join(' ');
                        }
                        suffix = ""; // Bỏ chữ mặc định
                    }
                    else if (formatType === 'short') {
                        // Rút gọn 1K, 1M, 1B
                        if (numVal >= 1000000000) val = (numVal / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
                        else if (numVal >= 1000000) val = (numVal / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
                        else if (numVal >= 1000) val = (numVal / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
                        else val = numVal.toLocaleString('vi-VN');
                    }
                    else {
                        val = numVal.toLocaleString('vi-VN');
                    }

                    let playerName = player.namecache || "Ẩn danh";
                    let medal = `#${index + 1}`;
                    let medalClass = "text-gray-400 text-base font-bold";
                    let rowBorder = "border-white/10";

                    if (index === 0) { medal = '🥇'; medalClass = "text-3xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"; rowBorder = "border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-transparent"; }
                    else if (index === 1) { medal = '🥈'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(148,163,184,0.8)]"; rowBorder = "border-gray-300/50 bg-gradient-to-r from-gray-400/20 to-transparent"; }
                    else if (index === 2) { medal = '🥉'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]"; rowBorder = "border-orange-400/50 bg-gradient-to-r from-orange-600/20 to-transparent"; }

                    boardHtml += `
                    <div class="glass-panel p-3 rounded-xl flex items-center justify-between border-l-4 ${rowBorder} hover:bg-white/10 hover:scale-[1.02] transition-all cursor-default">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div class="w-10 text-center ${medalClass} title-font">${medal}</div>
                            <div class="relative">
                                <img src="https://mc-heads.net/avatar/${playerName}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-white/20 bg-gray-900 object-cover shadow-md">
                                ${index === 0 ? '<div class="absolute -top-3 -right-2 text-lg">👑</div>' : ''}
                            </div>
                            <span class="font-bold text-white text-base sm:text-xl tracking-wide">${playerName}</span>
                        </div>
                        <div class="text-right">
                            <span class="${colorClass} font-black text-lg sm:text-2xl drop-shadow-sm">${prefix}${val}${suffix}</span>
                        </div>
                    </div>`;
                });
            }
            boardHtml += `</div></div>`;
            return boardHtml;
        };

        // 4. VẼ CÁC BẢNG VÀO HTML
        // Bảng Tháng 6 (Hiện đầu tiên - false)
        html += renderBoard("june", "TOP DONATE THÁNG 6", donateJuneBoard, "", " VNĐ", "text-orange-400", "border-orange-500/20", false, 20, 'short');

        // Bảng Donate Tổng (Chuyển sang Ẩn - true)
        html += renderBoard("donate", "BẢNG VÀNG DONATE TỔNG", donateBoard, "", " VNĐ", "text-pink-400", "border-pink-500/20", true, 20, 'short');

        // Các bảng còn lại giữ nguyên...
        html += renderBoard("money", "TOP ĐẠI GIA", moneyBoard, "$", "", "text-green-400", "border-green-500/20", true, 10, 'short');
        html += renderBoard("online", "TOP CHĂM CHỈ", onlineBoard, "", "", "text-cyan-400", "border-cyan-500/20", true, 20, 'time');
        html += renderBoard("point", "TOP ĐẠI GIA XU", pointBoard, "", " Xu", "text-yellow-400", "border-yellow-500/20", true, 10, 'short');
        html += renderBoard("kill", "TOP SÁT THỦ", killBoard, "", " Kill", "text-red-400", "border-red-500/20", true, 10, 'short');

        // const renderBoard = (tabId, title, boardData, prefix, suffix, colorClass, borderGlow, isHidden, limit = 10, useShortFormat = false) => {
        //     let boardHtml = `<div id="board-${tabId}" class="rank-board ${isHidden ? 'hidden' : ''} glass-intense p-4 sm:p-6 rounded-2xl border ${borderGlow} shadow-[0_0_30px_rgba(0,0,0,0.2)] relative overflow-hidden group transition-all duration-300">`;
        //     boardHtml += `<div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>`;
        //     boardHtml += `<h3 class="text-2xl font-black title-font text-center mb-6 ${colorClass} drop-shadow-md relative z-10">${title}</h3>`;
        //     boardHtml += `<div class="space-y-3 relative z-10">`;

        //     if (boardData.length === 0) {
        //         boardHtml += `<div class="text-center py-8 text-gray-500 italic text-sm">Chưa có dữ liệu</div>`;
        //     } else {
        //         // Cắt danh sách theo limit truyền vào
        //         const topList = boardData.slice(0, limit);
        //         topList.forEach((player, index) => {
        //             let numVal = parseFloat(player.value || 0);
        //             let val = "";

        //             // Xử lý làm ngắn gọn số tiền

        //             if (useShortFormat) {
        //                 if (numVal >= 1000000000) val = (numVal / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        //                 else if (numVal >= 1000000) val = (numVal / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        //                 else if (numVal >= 1000) val = (numVal / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        //                 else val = numVal.toLocaleString('vi-VN');
        //             } else {
        //                 val = numVal.toLocaleString('vi-VN');
        //             }

        //             let playerName = player.namecache || "Ẩn danh";

        //             let medal = `#${index + 1}`;
        //             let medalClass = "text-gray-400 text-base font-bold";
        //             let rowBorder = "border-white/10";

        //             if (index === 0) { medal = '🥇'; medalClass = "text-3xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"; rowBorder = "border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-transparent"; }
        //             else if (index === 1) { medal = '🥈'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(148,163,184,0.8)]"; rowBorder = "border-gray-300/50 bg-gradient-to-r from-gray-400/20 to-transparent"; }
        //             else if (index === 2) { medal = '🥉'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]"; rowBorder = "border-orange-400/50 bg-gradient-to-r from-orange-600/20 to-transparent"; }

        //             boardHtml += `
        //             <div class="glass-panel p-3 rounded-xl flex items-center justify-between border-l-4 ${rowBorder} hover:bg-white/10 hover:scale-[1.02] transition-all cursor-default">
        //                 <div class="flex items-center gap-3 sm:gap-4">
        //                     <div class="w-10 text-center ${medalClass} title-font">${medal}</div>
        //                     <div class="relative">
        //                         <img src="https://mc-heads.net/avatar/${playerName}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-white/20 bg-gray-900 object-cover shadow-md">
        //                         ${index === 0 ? '<div class="absolute -top-3 -right-2 text-lg">👑</div>' : ''}
        //                     </div>
        //                     <span class="font-bold text-white text-base sm:text-xl tracking-wide">${playerName}</span>
        //                 </div>
        //                 <div class="text-right">
        //                     <span class="${colorClass} font-black text-lg sm:text-2xl drop-shadow-sm">${prefix}${val}${suffix}</span>
        //                 </div>
        //             </div>`;
        //         });
        //     }
        //     boardHtml += `</div></div>`;
        //     return boardHtml;
        // };

        html += '</div>'; // Đóng div max-w-2xl

        container.classList.remove('max-w-7xl');
        container.classList.add('max-w-4xl');
        container.innerHTML = html;

    } catch (error) {
        console.error("Lỗi tải Ranking:", error);
        container.innerHTML = '<div class="text-red-500 text-center glass-panel p-6 border border-red-500/30 rounded-xl"> Lỗi kết nối đến dữ liệu máy chủ. Vui lòng thử lại sau!</div>';
    }
}

// ==========================================
// HÀM CHUYỂN TAB RANKING
// ==========================================
window.switchRankTab = (tabName) => {
    // 1. Ẩn tất cả các bảng
    document.querySelectorAll('.rank-board').forEach(el => el.classList.add('hidden'));

    // 2. Hiện bảng vừa được chọn
    const activeBoard = document.getElementById(`board-${tabName}`);
    if (activeBoard) activeBoard.classList.remove('hidden');

    // 3. Reset style tất cả các nút bấm về màu xám mờ (Thêm 'june' vào danh sách)
    ['june', 'donate', 'money', 'online', 'point', 'kill'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) btn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10';
    });

    // 4. Bật sáng nút bấm vừa được chọn với màu tương ứng
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        if (tabName === 'june') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-orange-600/20 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
        } else if (tabName === 'donate') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-pink-600/20 text-pink-400 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]';
        } else if (tabName === 'money') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-green-600/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.3)]';
        } else if (tabName === 'online') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
        } else if (tabName === 'point') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-yellow-600/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
        } else if (tabName === 'kill') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-red-600/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(248,113,113,0.3)]';
        }
    }
};

// ==========================================
// HÀM CHUYỂN TAB RANKING
// ==========================================
window.switchRankTab = (tabName) => {
    // 1. Ẩn tất cả các bảng
    document.querySelectorAll('.rank-board').forEach(el => el.classList.add('hidden'));

    // 2. Hiện bảng vừa được chọn
    const activeBoard = document.getElementById(`board-${tabName}`);
    if (activeBoard) activeBoard.classList.remove('hidden');

    // 3. Reset style tất cả các nút bấm về màu xám mờ
    ['june', 'donate', 'money', 'online', 'point', 'kill'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) btn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10';
    });

    // 4. Bật sáng nút bấm vừa được chọn với màu tương ứng
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        if (tabName === 'money') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-green-600/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.3)]';
        } else if (tabName === 'june') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-orange-600/20 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
        } else if (tabName === 'donate') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-cyan-300/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
        } else if (tabName === 'online') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
        } else if (tabName === 'point') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-yellow-600/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
        } else if (tabName === 'kill') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-red-600/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(248,113,113,0.3)]';
        }
    }
};

// ==========================================
// CẬP NHẬT TRẠNG THÁI SERVER (SỐ NGƯỜI CHƠI)
// ==========================================
async function updateServerStatus() {
    const apiUrl = `https://api.mcsrvstat.us/2/103.161.119.48:25626`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const statOnlineEl = document.getElementById('stat-online');
        const navOnlineEl = document.getElementById('nav-online');
        const statVersionEl = document.getElementById('stat-peak');
        const statusDot = document.querySelector('.status-dot');

        if (data.online === true) {
            // 1. LẤY SỐ NGƯỜI ONLINE: data.players.online (Trong JSON của bạn là 20)
            const currentPlayers = data.players.online || 0;

            if (statOnlineEl) statOnlineEl.innerText = currentPlayers;

            if (navOnlineEl) {
                navOnlineEl.innerHTML = `<span class="text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">${currentPlayers}</span>`;
            }

            // Chấm tròn xanh trạng thái
            if (statusDot) {
                statusDot.style.background = '#4ade80';
                statusDot.style.boxShadow = '0 0 10px #4ade80';
            }

            // 2. LẤY PHIÊN BẢN: data.version (Trong JSON là "Leaf 1.21.8")
            if (statVersionEl && data.version) {
                const versionString = data.version;
                // Regex lọc lấy số (ví dụ: 1.21.8)
                const cleanVersion = versionString.match(/\d+\.\d+(\.\d+)?/);
                statVersionEl.innerText = cleanVersion ? cleanVersion[0] : versionString;
            }

        } else {
            // Xử lý khi Offline
            if (statOnlineEl) statOnlineEl.innerText = "OFF";
            if (navOnlineEl) navOnlineEl.innerHTML = `<span class="text-red-400">OFFLINE</span>`;
            if (statusDot) {
                statusDot.style.background = '#f87171';
                statusDot.style.boxShadow = '0 0 10px #f87171';
            }
        }
    } catch (error) {
        console.error("Lỗi kết nối API Server:", error);
    }
}
async function renderForum(filterMode = 'approved') {
    // filterMode có 3 dạng: 'approved' (chung), 'pending' (admin duyệt), 'mine' (bài của tôi)

    const container = document.getElementById('forum-container');
    if (!container) return;

    // 1. VẼ THANH TAB (Tùy theo quyền hạn)
    if (!document.getElementById('forum-tabs')) {
        let tabsHTML = `
        <div id="forum-tabs" class="flex flex-wrap gap-3 mb-6">
            <button id="tab-approved" onclick="window.filterForum('approved')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-cyan-500/30 bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                🌐 CỘNG ĐỒNG
            </button>`;

        // Nếu là Admin/Dev -> Hiện tab Duyệt bài
        if (['admin', 'dev'].includes(currentRole)) {
            tabsHTML += `
            <button id="tab-pending" onclick="window.filterForum('pending')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-yellow-500/30 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10">
                🛡️ KHO DUYỆT BÀI ⚠️
            </button>`;
        }

        // Nếu đã đăng nhập (bất kể role nào) -> Hiện tab Bài của tôi
        if (currentUser) {
            tabsHTML += `
            <button id="tab-mine" onclick="window.filterForum('mine')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-purple-500/30 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10">
                👤 BÀI CỦA TÔI
            </button>`;
        }

        tabsHTML += `</div><div id="forum-list" class="space-y-4"></div>`;
        container.innerHTML = tabsHTML;
    }

    // 2. CẬP NHẬT TRẠNG THÁI NÚT BẤM (Active State)
    const buttons = {
        'approved': document.getElementById('tab-approved'),
        'pending': document.getElementById('tab-pending'),
        'mine': document.getElementById('tab-mine')
    };

    // Reset style tất cả nút
    Object.values(buttons).forEach(btn => {
        if (btn) {
            btn.className = "px-5 py-2 rounded-lg font-bold text-sm transition border border-gray-700 text-gray-400 hover:bg-white/5";
        }
    });

    // Highlight nút đang chọn
    if (filterMode === 'approved' && buttons.approved) {
        buttons.approved.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)] border border-cyan-400";
    } else if (filterMode === 'pending' && buttons.pending) {
        buttons.pending.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-yellow-600 text-white shadow-[0_0_10px_rgba(202,138,4,0.5)] border border-yellow-400";
    } else if (filterMode === 'mine' && buttons.mine) {
        buttons.mine.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] border border-purple-400";
    }

    // 3. LẤY DỮ LIỆU
    const listContainer = document.getElementById('forum-list');
    listContainer.innerHTML = '<div class="text-center py-8"><div class="loader-ring w-8 h-8 mx-auto"></div><p class="text-xs text-gray-500 mt-2">Đang tải dữ liệu...</p></div>';

    let posts = [];
    try {
        if (filterMode === 'mine' && currentUser) {
            posts = await fetchMyPosts(currentUser.uid);
        } else {
            // Nếu filter là 'pending' nhưng user ko phải admin -> Ép về 'approved' để bảo mật
            if (filterMode === 'pending' && !['admin', 'dev'].includes(currentRole)) filterMode = 'approved';
            posts = await fetchForumPosts(filterMode);
        }
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="text-red-500 text-center">Lỗi tải dữ liệu. (Có thể cần tạo Index Firestore)</div>`;
        return;
    }

    const isStaff = ['admin', 'dev', 'staff', 'helper', 'media'].includes(currentRole);

    if (posts.length === 0) {
        let emptyMsg = "Chưa có bài viết nào.";
        if (filterMode === 'pending') emptyMsg = "Tuyệt vời! Đã duyệt hết bài.";
        if (filterMode === 'mine') emptyMsg = "Bạn chưa đăng bài viết nào.";

        listContainer.innerHTML = `<div class="glass-panel p-8 text-center text-gray-500 italic border border-dashed border-gray-700 rounded-xl">${emptyMsg}</div>`;
        return;
    }

    // 4. RENDER DANH SÁCH
    listContainer.innerHTML = posts.map(post => {
        const isOwner = currentUser && currentUser.uid === post.authorId;
        const canDelete = isStaff || isOwner;

        // Logic hiển thị Badge trạng thái (Cho tab Bài của tôi)
        let statusBadge = '';
        if (filterMode === 'mine') {
            if (post.status === 'approved') statusBadge = `<span class="bg-green-500/20 text-green-400 border border-green-500/50 text-[10px] px-2 py-0.5 rounded uppercase font-bold inline-flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>Đã duyệt</span>`;
            else statusBadge = `<span class="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px] px-2 py-0.5 rounded uppercase font-bold"> Đang chờ</span>`;
        }

        return `
        <div class="glass-panel p-6 rounded-xl forum-post hover:bg-white/5 transition relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition"></div>

            <div class="flex items-start space-x-4">
                <img src="${post.avatar || `https://mc-heads.net/avatar/${post.author}`}" class="w-12 h-12 rounded-lg border border-purple-500/30 shadow-sm bg-gray-900 object-cover">
                <div class="flex-1 w-full min-w-0">
                    <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold title-font text-white truncate max-w-[150px] sm:max-w-xs">${post.author}</h4>
                            <span class="text-[10px] bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-gray-400">${post.authorRole || 'Member'}</span>
                            ${statusBadge}
                        </div>
                        <span class="text-xs text-purple-300/70 font-mono">${new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    
                    <h3 class="text-lg sm:text-xl font-bold title-font mb-2 text-cyan-200 break-words">${post.title}</h3>
                    <div class="text-purple-100/80 text-sm mb-4 whitespace-pre-line bg-black/20 p-3 rounded-lg border border-white/5 overflow-hidden break-words">${post.content}</div>
                    
                    <div class="flex items-center justify-between border-t border-gray-700/50 pt-3 mt-2">
                        <button onclick="window.toggleComments('${post.id}')" class="text-xs sm:text-sm text-gray-400 hover:text-cyan-400 transition flex items-center gap-2 group-btn">
                            <span class="group-btn-hover:scale-110 transition">💬</span> Bình luận
                        </button>
                        
                        <div class="flex gap-2">
                            ${filterMode === 'pending' && isStaff ? `<button onclick="window.approvePost('${post.id}')" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold shadow-lg shadow-green-900/20 inline-flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>DUYỆT NGAY</button>` : ''}
                            ${canDelete ? `<button onclick="window.deletePost('forum_posts', '${post.id}')" class="text-red-500 hover:text-red-300 text-xs font-bold border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded transition inline-flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Xóa</button>` : ''}
                        </div>
                    </div>

                    <div id="comments-section-${post.id}" class="hidden mt-4 pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-purple-500/20">
                        <div id="comments-list-${post.id}" class="space-y-3 mb-3 max-h-60 overflow-y-auto custom-scrollbar p-1"></div>
                        ${currentUser ? `
                        <div class="flex gap-2 relative">
                            <input type="text" id="comment-input-${post.id}" class="cyber-input w-full px-4 py-2 rounded-full text-sm pr-10" placeholder="Viết bình luận..." onkeydown="if(event.key==='Enter') window.sendComment('${post.id}')">
                            <button onclick="window.sendComment('${post.id}')" class="absolute right-1 top-1 bg-cyan-600 hover:bg-cyan-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition">➤</button>
                        </div>` : '<p class="text-xs text-gray-500 italic bg-black/30 p-2 rounded text-center">Đăng nhập để tham gia thảo luận.</p>'}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

async function renderComments(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    container.innerHTML = '<div class="text-xs text-gray-500">Đang tải...</div>';

    try {
        const comments = await fetchComments(postId);
        const isStaff = ['admin', 'dev'].includes(currentRole);

        if (comments.length === 0) {
            container.innerHTML = '<div class="text-xs text-gray-600 italic">Chưa có bình luận nào.</div>';
            return;
        }

        container.innerHTML = comments.map(c => {
            const isOwner = currentUser && currentUser.uid === c.uid;
            const canDel = isStaff || isOwner;
            return `
            <div class="flex gap-3">
                <img src="${c.avatar}" class="w-6 h-6 rounded-full border border-gray-600">
                <div class="bg-gray-800/50 rounded-lg px-3 py-2 w-full border border-gray-700">
                    <div class="flex justify-between items-baseline mb-1">
                        <span class="text-xs font-bold text-cyan-400">${c.username}</span>
                        <div class="flex gap-2 items-center">
                            <span class="text-[10px] text-gray-500">${new Date(c.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ${canDel ? `<button onclick="window.deleteCommentAction('${postId}', '${c.id}')" class="text-red-500 hover:text-white text-[10px]">✕</button>` : ''}
                        </div>
                    </div>
                    <p class="text-sm text-gray-300">${c.content}</p>
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function renderAdminTable() {
    const tbody = document.getElementById('admin-user-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-purple-300"> Đang tải dữ liệu...</td></tr>';

    try {
        const users = await fetchAllUsers();
        document.getElementById('total-users-count').innerText = users.length;

        tbody.innerHTML = users.map(u => {
            const isMe = currentUser && currentUser.uid === u.id;
            const avatar = u.photoURL || `https://mc-heads.net/avatar/${u.username}`;
            const roles = ['member', 'vip', 'media', 'helper', 'staff', 'dev', 'admin'];

            return `
            <tr class="hover:bg-white/5 transition border-b border-purple-500/10 user-row">
                <td class="p-4 flex items-center gap-3">
                    <img src="${avatar}" class="w-8 h-8 rounded border border-purple-500/30">
                    <div>
                        <div class="font-bold text-white text-sm">${u.username} ${isMe ? '<span class="text-cyan-400">(Bạn)</span>' : ''}</div>
                    </div>
                </td>
                <td class="p-4 text-gray-400 text-xs">${u.email}</td>
                <td class="p-4 text-gray-400 text-xs">${u.joinedAt ? new Date(u.joinedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                <td class="p-4">
                    <select onchange="window.handleRoleChange('${u.id}', this.value)" class="bg-black/50 border border-purple-500/30 text-xs text-white rounded px-2 py-1 outline-none">
                        ${roles.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''} class="bg-gray-900">${r.toUpperCase()}</option>`).join('')}
                    </select>
                </td>
                <td class="p-4 text-center">
                    ${!isMe ? `<button onclick="window.handleDeleteUser('${u.id}', '${u.username}')" class="text-red-500 hover:text-white bg-red-500/10 p-1.5 rounded inline-flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>` : ''}
                </td>
            </tr>`;
        }).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-red-500 text-center">Lỗi: ${e.message}</td></tr>`; }
}

// ==========================================
// RENDER SỰ KIỆN GIVEAWAY
// ==========================================
async function renderGiveaways() {
    const container = document.getElementById('giveaways-list');
    if (!container) return;

    // Hiện nút Tạo Sự kiện nếu là Ban Quản Trị
    if (['admin', 'dev', 'staff', 'media'].includes(currentRole)) {
        document.getElementById('admin-giveaway-controls')?.classList.remove('hidden');
    } else {
        document.getElementById('admin-giveaway-controls')?.classList.add('hidden');
    }

    try {
        const giveaways = await fetchActiveGiveaways();

        if (giveaways.length === 0) {
            container.innerHTML = '<div class="glass-panel p-8 text-center text-gray-500 italic rounded-xl border border-dashed border-gray-700">Hiện tại chưa có sự kiện Giveaway nào diễn ra. Quý khách vui lòng quay lại sau!</div>';
            return;
        }

        container.innerHTML = giveaways.map(gw => {
            const hasJoined = currentUser && gw.participants && gw.participants.includes(currentUser.uid);
            const isClosed = gw.status === 'closed'; // Kiểm tra xem sự kiện đã chốt giải chưa

            // Xử lý format ngày tháng hiển thị đẹp
            const endDate = new Date(gw.endTime);
            const endTimeStr = isNaN(endDate.getTime()) ? gw.endTime : endDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

            // 1. GIAO DIỆN NÚT BẤM HOẶC BẢNG KẾT QUẢ
            let actionBtn = '';
            if (isClosed) {
                // Nếu đã chốt -> Hiện bảng thông báo người thắng
                actionBtn = `
                    <div class="text-center bg-yellow-500/10 border border-yellow-500/30 px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <p class="text-[10px] text-yellow-200 uppercase font-bold mb-1 tracking-widest">👑 NGƯỜI TRÚNG GIẢI 👑</p>
                        <p class="text-xl font-black text-yellow-400">${gw.winnerName || 'Không có ai'}</p>
                    </div>
                `;
            } else if (!currentUser) {
                actionBtn = `<button onclick="document.getElementById('auth-modal').classList.add('active')" class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-bold transition w-full md:w-auto">ĐĂNG NHẬP ĐỂ THAM GIA</button>`;
            } else if (hasJoined) {
                actionBtn = `<button disabled class="bg-green-600/50 text-green-300 border border-green-500/50 px-6 py-2.5 rounded-lg font-bold cursor-not-allowed w-full md:w-auto inline-flex items-center justify-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>ĐÃ BÁO DANH</button>`;
            } else {
                actionBtn = `<button onclick="window.joinGiveawayAction('${gw.id}')" class="bg-gradient-to-r from-pink-600 to-purple-500 hover:from-pink-500 hover:to-purple-400 text-white px-8 py-2.5 rounded-lg font-bold shadow-[0_0_20px_rgba(236,72,153,0.4)] transition transform hover:scale-105 w-full md:w-auto">🎉 THAM GIA NGAY</button>`;
            }

            // 2. GIAO DIỆN NÚT QUẢN LÝ CỦA ADMIN
            let adminBtn = '';
            if (currentRole === 'admin') {
                if (!isClosed) {
                    // Nếu chưa chốt -> Hiện nút Chốt
                    adminBtn = `<button onclick="window.endGiveawayAction('${gw.id}')" class="mt-4 bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition w-full shadow-lg shadow-yellow-900/30">🏆 CHỐT SỰ KIỆN & QUAY SỐ</button>`;
                } else {
                    // Nếu chốt rồi -> Hiện nút Xóa để dọn dẹp
                    adminBtn = `<button onclick="window.deleteDocument('giveaways', '${gw.id}'); setTimeout(()=>renderGiveaways(), 500);" class="mt-4 bg-red-600/50 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition w-full inline-flex items-center justify-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>XÓA SỰ KIỆN NÀY</button>`;
                }
            }

            // 3. TAG TRẠNG THÁI GÓC TRÊN CÙNG
            const statusBadge = isClosed
                ? `<span class="bg-gray-900/80 text-gray-400 border border-gray-500/50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 inline-block">🔒 ĐÃ KẾT THÚC</span>`
                : `<span class="bg-pink-900/50 text-pink-400 border border-pink-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 inline-block animate-pulse">🔥 ĐANG DIỄN RA</span>`;

            return `
            <div class="glass-panel p-6 sm:p-8 rounded-2xl border ${isClosed ? 'border-gray-600/30 opacity-80' : 'border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.1)]'} relative overflow-hidden group">
                ${!isClosed ? '<div class="absolute -right-10 -top-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition duration-700 pointer-events-none"></div>' : ''}
                
                <div class="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div class="text-center md:text-left w-full md:w-auto flex-1">
                        ${statusBadge}
                        <h3 class="text-2xl sm:text-3xl font-black ${isClosed ? 'text-gray-300' : 'text-white'} mb-2 title-font">${gw.title}</h3>
                        <p class="text-lg text-yellow-400 font-bold mb-3 flex items-center justify-center md:justify-start gap-2">
                            <span class="text-2xl">🎁</span> ${gw.prize}
                        </p>
                        <div class="text-sm text-gray-400 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 font-mono">
                            <span class="bg-black/40 px-2 py-1 rounded border border-white/5"> Hạn chót: ${endTimeStr}</span>
                            <span class="bg-black/40 px-2 py-1 rounded border border-white/5">👥 Đã đăng ký: <span class="text-cyan-400 font-bold">${gw.participants ? gw.participants.length : 0}</span> người</span>
                        </div>
                    </div>
                    <div class="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0 flex flex-col items-end">
                        <div class="w-full">${actionBtn}</div>
                        <div class="w-full">${adminBtn}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        console.error("LỖI TẢI GIVEAWAY:", error);
        container.innerHTML = '<div class="text-red-500 p-4 text-center glass-panel border border-red-500/30 rounded-xl">Lỗi kết nối máy chủ dữ liệu. Vui lòng ấn F12 xem Console!</div>';
    }
}

// ==========================================
// CÁC HÀNH ĐỘNG CỦA GIVEAWAY
// ==========================================
window.joinGiveawayAction = async (id) => {
    try {
        showCustomModal("ĐANG XỬ LÝ", " Hệ thống đang kiểm tra điều kiện tài khoản...", "info");
        await joinGiveaway(id);
        showCustomModal("🎉 ĐĂNG KÝ THÀNH CÔNG", "Bạn đã ghi danh thành công vào sự kiện!\nKết quả sẽ được công bố khi Admin chốt giải. Chúc bạn may mắn!", "info");
        renderGiveaways();
    } catch (err) {
        if (err.message === "NOT_VERIFIED") {
            showCustomModal(" TỪ CHỐI THAM GIA", "Tài khoản của bạn chưa được liên kết với ID Discord!\n\n**Cách khắc phục:**\n1. Mở Hồ Sơ Cá Nhân (Avatar góc phải).\n2. Nhập ID Discord của bạn.\n3. Bấm [NHẬN MÃ] và kiểm tra tin nhắn Discord để xác minh.", "danger");
        } else if (err.message === "ALREADY_JOINED") {
            showCustomModal("THÔNG BÁO", "Bạn đã có tên trong danh sách tham gia sự kiện này rồi!", "info");
        } else {
            showCustomModal("LỖI KẾT NỐI", err.message, "danger");
        }
    }
};

window.endGiveawayAction = (id) => {
    showCustomModal(
        "XÁC NHẬN CHỐT GIẢI",
        "Hệ thống sẽ tổng hợp danh sách và chọn **NGẪU NHIÊN 1 NGƯỜI** trúng thưởng.\nBạn có chắc chắn muốn kết thúc sự kiện này ngay bây giờ?",
        "confirm",
        async () => {
            try {
                showCustomModal("ĐANG QUAY SỐ", " Đang tổng hợp danh sách và chọn người may mắn...", "info");

                // Lấy kết quả quay số (Bây giờ nó trả về nguyên 1 cục data)
                const result = await endGiveaway(id);

                showCustomModal("🎉 ĐÃ TÌM THẤY NGƯỜI TRÚNG GIẢI", `Sự kiện đã kết thúc!\nNgười may mắn nhất là: **${result.winnerName}** 🏆`, "info");
                renderGiveaways(); // Tải lại danh sách

                // ==========================================
                // BẮN THÔNG BÁO DISCORD KẾT QUẢ TRÚNG THƯỞNG
                // ==========================================

                // Kiểm tra xem ID Discord có hợp lệ không để ping (<@ID>), nếu không thì chỉ in chữ in đậm
                const isIdValid = result.winnerDiscordId && /^\d+$/.test(result.winnerDiscordId);
                const tagWinner = isIdValid ? `<@${result.winnerDiscordId}>` : `**${result.winnerName}**`;

                const discordMessage = result.winnerName === "Không có ai tham gia"
                    ? `😔 Rất tiếc, sự kiện **${result.title}** đã kết thúc nhưng không có ai tham gia!`
                    : `🎉 **KẾT QUẢ SỰ KIỆN: ${result.title.toUpperCase()}** 🎉\nXin chúc mừng ${tagWinner} đã là người may mắn nhất! Vui lòng liên hệ Admin để nhận thưởng nhé!`;

                await sendDiscordWebhook(discordMessage, [{
                    title: "🏆 CHI TIẾT GIẢI THƯỞNG",
                    description: `🎁 **Phần thưởng:** ${result.prize}\n👤 **Người trúng:** ${result.winnerName}`,
                    color: 15469315, // Mã màu vàng Gold
                    footer: { text: "CornMC Event System" },
                    timestamp: new Date().toISOString()
                }]);

            } catch (e) {
                showCustomModal("LỖI", e.message, "danger");
            }
        }
    );
};

// ==========================================
// 4. AUTH & INIT (Khởi động)
// ==========================================

// Chuyển đổi giữa các form Login / Register / Forgot
window.switchAuthForm = (formId) => {
    document.querySelectorAll('.auth-form').forEach(el => el.classList.add('hidden'));
    document.getElementById(`form-${formId}`).classList.remove('hidden');
};

function setupAuthForms() {
    // Login
    document.getElementById('email-login-form').onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        try {
            await loginEmail(input, pass);
            document.getElementById('auth-modal').classList.remove('active');
        } catch (err) { alert("Đăng nhập thất bại: " + err.message); }
    };

    // Register
    document.getElementById('email-register-form').onsubmit = async (e) => {
        e.preventDefault();
        const user = document.getElementById('reg-username').value;
        const pass = document.getElementById('reg-pass').value;
        try {
            await registerEmail(user, pass);
            alert("Đăng ký thành công!");
            document.getElementById('auth-modal').classList.remove('active');
        } catch (err) { alert("Đăng ký lỗi: " + err.message); }
    };

    // Forgot Password
    document.getElementById('forgot-pass-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        try {
            await resetPassword(email);
            alert("Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư!");
            window.switchAuthForm('login');
        } catch (err) { alert("Lỗi: " + err.message); }
    };

    // Google
    document.getElementById('google-login-btn').onclick = async () => {
        try { await loginGoogle(); document.getElementById('auth-modal').classList.remove('active'); }
        catch (e) { alert(e.message); }
    };
}

function handleAuthUI(user, role, dbData) {
    currentUser = user;
    currentRole = role;
    currentUserData = dbData || {};
    const authDisplay = document.getElementById('auth-display');

    if (user) {
        // 1. XỬ LÝ GIAO DIỆN ĐĂNG NHẬP
        const avatar = user.photoURL || `https://mc-heads.net/avatar/${user.displayName}`;
        authDisplay.innerHTML = `
            <div class="relative group z-50">
                <button class="flex items-center gap-2.5 glass-panel p-1 lg:pl-1.5 lg:pr-4 lg:py-1.5 rounded-full hover:bg-white/10 transition border border-cyan-400/50 w-max">
                    <img src="${avatar}" class="w-8 h-8 rounded-full border border-cyan-400 object-cover shrink-0">
                    
                    <div class="text-left hidden xl:block whitespace-nowrap">
                        <div class="text-sm font-bold text-white leading-none mb-1">${user.displayName}</div>
                        <div class="text-[10px] text-purple-300 font-bold uppercase leading-none">${role}</div>
                    </div>
                </button>
                <div class="absolute right-0 mt-2 w-56 bg-[#0f0f1a] border border-purple-500/30 rounded-xl shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 overflow-hidden z-50">
                    
                    <button id="btn-profile" class="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-white border-b border-white/5 transition">👤 Hồ sơ</button>
                    
                    ${['admin', 'dev', 'staff', 'media', 'helper'].includes(role) ? `<a href="internal.html" class="block w-full text-left px-4 py-3 text-sm text-cyan-400 hover:bg-cyan-500/20 font-bold border-b border-white/5 no-underline transition">🏢 Khu Vực Nội Bộ</a>` : ''}
                    
                    ${['admin'].includes(role) ? `<button id="btn-admin" class="block w-full text-left px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/20 font-bold border-b border-white/5 transition">👥 Quản Lý User</button>` : ''}
                    
                    ${['admin', 'dev'].includes(role) ? `<a href="admin.html" class="block w-full text-left px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/20 font-bold border-b border-white/5 no-underline transition">🛡️ Admin Panel</a>` : ''}
                    
                    <button id="btn-logout" class="block w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 transition">⏏ Đăng xuất</button>
                </div>
            </div>`;

        // Gán sự kiện click
        document.getElementById('btn-logout').onclick = () => { showCustomModal("ĐĂNG XUẤT", "Bạn có chắc chắn muốn đăng xuất?", "confirm", () => logout()); };
        document.getElementById('btn-profile').onclick = () => {
            if (document.getElementById('edit-name')) document.getElementById('edit-name').value = user.displayName || '';
            if (document.getElementById('edit-avatar')) document.getElementById('edit-avatar').value = user.photoURL || '';
            if (document.getElementById('profile-preview')) document.getElementById('profile-preview').src = avatar;

            if (document.getElementById('edit-discord-link')) document.getElementById('edit-discord-link').value = currentUserData.discordLink || '';
            if (document.getElementById('edit-website-link')) document.getElementById('edit-website-link').value = currentUserData.websiteLink || '';

            document.getElementById('profile-modal').classList.add('active');

            // Reset lại giao diện nhập mã
            document.getElementById('discord-verify-zone').classList.add('hidden');
            document.getElementById('edit-discord-link').disabled = false;
        };

        // --- XỬ LÝ NÚT [NHẬN MÃ] ---
        document.getElementById('btn-request-verify').onclick = async () => {
            const discordId = document.getElementById('edit-discord-link').value.trim();
            // Kiểm tra ID Discord chỉ được chứa số
            if (!/^\d{17,19}$/.test(discordId)) {
                return showCustomModal("LỖI", "ID Discord không hợp lệ! Vui lòng nhập đúng dãy số ID (khoảng 18 chữ số).", "danger");
            }

            const btn = document.getElementById('btn-request-verify');
            btn.innerText = " ĐANG XỬ LÝ...";
            btn.disabled = true;

            try {
                // 1. KIỂM TRA TRÙNG ID DISCORD TRƯỚC KHI GỬI MÃ
                const { checkDiscordIdExists } = await import('./core.js');
                const isExist = await checkDiscordIdExists(discordId);

                if (isExist) {
                    showCustomModal("LỖI LIÊN KẾT", "ID Discord này đã được sử dụng bởi một tài khoản khác trên hệ thống!", "danger");
                    btn.innerText = "NHẬN MÃ";
                    btn.disabled = false;
                    return; // Dừng lại, không gửi mã nữa
                }

                // 2. Tiếp tục tạo mã ngẫu nhiên 6 chữ số
                const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

                const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
                const { db } = await import('./core.js');

                // Lưu mã vào bảng tạm thời trên Firebase
                await setDoc(doc(db, "discord_verify", currentUser.uid), {
                    discordId: discordId,
                    code: verifyCode,
                    createdAt: serverTimestamp()
                });

                // Hiển thị ô nhập mã
                document.getElementById('discord-verify-zone').classList.remove('hidden');
                document.getElementById('edit-discord-link').disabled = true;

                showCustomModal("THÀNH CÔNG", "Mã xác minh đã được tạo trên hệ thống.\n\n⚠️ LƯU Ý: Website đã lưu yêu cầu gửi mã cho Bot. Vui lòng check tin nhắn Discord!", "info");
            } catch (err) {
                showCustomModal("LỖI", "Lỗi tạo mã: " + err.message, "danger");
            } finally {
                btn.innerText = "NHẬN MÃ";
                btn.disabled = false;
            }
        };

        // --- XỬ LÝ NÚT [XÁC NHẬN] ---
        document.getElementById('btn-confirm-verify').onclick = async () => {
            const inputCode = document.getElementById('discord-verify-code').value.trim();
            if (inputCode.length !== 6) return;

            const btn = document.getElementById('btn-confirm-verify');
            btn.innerText = "...";
            btn.disabled = true;

            try {
                const { doc, getDoc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
                const { db } = await import('./core.js');

                // Lấy mã từ Firebase ra đối chiếu
                const docRef = doc(db, "discord_verify", currentUser.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().code === inputCode) {
                    // MÃ ĐÚNG! Lấy ID Discord lưu vào profile luôn
                    const verifiedDiscordId = docSnap.data().discordId;

                    // Xóa mã đi để tránh dùng lại
                    await deleteDoc(docRef);

                    showCustomModal("LIÊN KẾT THÀNH CÔNG", `Đã xác minh thành công ID Discord: ${verifiedDiscordId}!\n\nHãy ấn LƯU THAY ĐỔI để hoàn tất.`, "info");

                    document.getElementById('discord-verify-zone').classList.add('hidden');
                    document.getElementById('edit-discord-link').value = verifiedDiscordId; // Trả lại ID vào ô
                } else {
                    showCustomModal("SAI MÃ", "Mã xác minh không chính xác hoặc đã hết hạn!", "danger");
                }
            } catch (err) {
                showCustomModal("LỖI", err.message, "danger");
            } finally {
                btn.innerText = "XÁC NHẬN";
                btn.disabled = false;
            }
        };
        if (document.getElementById('btn-admin')) {
            document.getElementById('btn-admin').onclick = () => {
                document.getElementById('admin-modal').classList.add('active');
                renderAdminTable();
            };
        }

        // Thêm 'member' vào danh sách cho phép
        if (['admin', 'dev', 'staff', 'helper', 'media', 'member'].includes(role)) {
            const btn = document.getElementById('create-post-trigger');
            if (btn) btn.classList.remove('hidden');
        }

        const oldTabs = document.getElementById('forum-tabs');
        if (oldTabs) oldTabs.remove();

        // 2. Nếu đang đứng ở trang Diễn đàn hoặc Giveaway, VẼ LẠI CÁI MỚI NGAY
        if (document.getElementById('section-forum').classList.contains('active')) {
            renderForum('approved');
        }
        if (document.getElementById('section-giveaway').classList.contains('active')) {
            renderGiveaways(); // <-- CẬP NHẬT NÚT BẤM KHI ĐĂNG NHẬP
        }

    } else {
        // ... (Giữ nguyên phần chưa đăng nhập)
        authDisplay.innerHTML = `<button id="login-trigger" class="cyber-btn px-6 py-2.5 rounded-lg font-bold text-sm title-font">LOGIN</button>`;
        document.getElementById('login-trigger').onclick = () => document.getElementById('auth-modal').classList.add('active');
        const btn = document.getElementById('create-post-trigger');
        if (btn) btn.classList.add('hidden');

        // Nếu logout, cũng cần reset lại forum và giveaway
        const oldTabs = document.getElementById('forum-tabs');
        if (oldTabs) oldTabs.remove();
        if (document.getElementById('section-forum').classList.contains('active')) renderForum('approved');
        if (document.getElementById('section-giveaway').classList.contains('active')) renderGiveaways(); // <-- CẬP NHẬT KHI ĐĂNG XUẤT
    }
}

// Particle Effect 
const initParticles = () => {
    const canvas = document.getElementById('particle-network');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particlesArray = [];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.color = Math.random() > 0.5 ? '#8b5cf6' : '#22d3ee';
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
            if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
        }
        draw() {
            ctx.fillStyle = this.color; ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    for (let i = 0; i < Math.floor((canvas.width * canvas.height) / 20000); i++) particlesArray.push(new Particle());

    function animate() {
        // KIỂM TRA: NẾU ĐANG BẬT LITE-MODE THÌ KHÔNG VẼ NỮA ĐỂ CỨU GPU
        if (!document.body.classList.contains('lite-mode')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update(); particlesArray[i].draw();
                for (let j = i; j < particlesArray.length; j++) {
                    const dx = particlesArray[i].x - particlesArray[j].x;
                    const dy = particlesArray[i].y - particlesArray[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath(); ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 - dist / 1000})`;
                        ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                        ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                        ctx.stroke();
                    }
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
};
// ==========================================
// MENU TẢI TÀI NGUYÊN (4 OPTIONS)
// ==========================================
window.showDownloadModal = () => {
    // 🔴 QUAN TRỌNG: Thay thế ID file của bạn vào 4 link bên dưới
    const linkShaderpacks = "https://drive.google.com/drive/folders/1ZKLCqALrOFLbDbzW_5DcOfozMk2suMK4?usp=sharing";
    const linkResourcepacks = "https://drive.google.com/drive/folders/1c0kkKdMumDKh614uJizv4p3stRE5x3d9?usp=sharing";
    const linkMods = "https://drive.google.com/drive/folders/1RvbSeqH3EGBn-7fIpoOmjeDd4L8EYW-0?usp=sharing";
    const linkFullfile = "https://drive.google.com/uc?export=download&id=1oPo2PjK5qnnrE9FXfCm_ybS6zFR1eMGA";

    const htmlContent = `
        <div class="space-y-3 text-center mt-4 pb-2">
            <p class="text-gray-300 text-sm mb-4">Chọn mục bạn muốn tải. Hệ thống sẽ tải tệp .zip trực tiếp về máy!</p>
            
            <a href="${linkShaderpacks}" class="flex items-center justify-between w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white font-bold py-3 px-5 rounded-xl border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)] hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300 group no-underline">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">✨</span>
                    <span class="text-left block text-lg">shaderpacks</span>
                </div>
                <span class="text-xl animate-bounce">⬇️</span>
            </a>
            
            <a href="${linkResourcepacks}" class="flex items-center justify-between w-full bg-green-600/20 hover:bg-green-600/40 text-green-300 hover:text-white font-bold py-3 px-5 rounded-xl border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)] hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-300 group no-underline">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">🎨</span>
                    <span class="text-left block text-lg">resourcepacks</span>
                </div>
                <span class="text-xl animate-bounce">⬇️</span>
            </a>

            <a href="${linkMods}" class="flex items-center justify-between w-full bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white font-bold py-3 px-5 rounded-xl border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-300 group no-underline">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">📦</span>
                    <span class="text-left block text-lg">mods</span>
                </div>
                <span class="text-xl animate-bounce">⬇️</span>
            </a>

            <a href="${linkFullfile}" class="flex items-center justify-between w-full bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 hover:text-white font-bold py-3 px-5 rounded-xl border border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all duration-300 group no-underline">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">📁</span>
                    <span class="text-left block text-lg">fullfile</span>
                </div>
                <span class="text-xl animate-bounce">⬇️</span>
            </a>
        </div>
    `;

    // Gọi hàm Modal có sẵn của bạn để hiển thị
    showCustomModal("TẢI TÀI NGUYÊN SERVER", htmlContent, "info");
};

// ==========================================
// CÔNG TẮC BẬT/TẮT CHẾ ĐỘ SIÊU MƯỢT (LITE MODE)
// ==========================================
window.togglePerformance = () => {
    const body = document.body;
    body.classList.toggle('lite-mode');
    const isLite = body.classList.contains('lite-mode');

    // Lưu vào bộ nhớ trình duyệt
    localStorage.setItem('liteMode', isLite ? 'on' : 'off');

    // Hiện thông báo
    if (isLite) {
        showCustomModal("CHẾ ĐỘ TỐI ƯU", "⚡ Đã BẬT chế độ Siêu Mượt!\nTắt hiệu ứng hạt, ảnh nền và kính mờ để tối ưu 100% GPU.", "info");
    } else {
        showCustomModal("CHẾ ĐỘ ĐỒ HỌA CAO", "✨ Đã TẮT chế độ Siêu Mượt!\nĐồ họa và các hiệu ứng đã được bật tối đa.", "info");
    }
};

// --- LOGIC THIẾT LẬP MẶC ĐỊNH LÀ LITE MODE ---
const savedLiteMode = localStorage.getItem('liteMode');

// Nếu người dùng chưa từng chỉnh (lần đầu vào web) 
// HOẶC đang để là 'on' thì mặc định bật Lite Mode
if (savedLiteMode === null || savedLiteMode === 'on') {
    document.body.classList.add('lite-mode');
    // Lưu lại trạng thái 'on' vào máy người dùng nếu là lần đầu
    if (savedLiteMode === null) localStorage.setItem('liteMode', 'on');
} else {
    // Nếu người dùng đã chủ động tắt (off), thì giữ nguyên (không add class)
    document.body.classList.remove('lite-mode');
}


// Tự động kiểm tra xem người dùng có từng bật Lite Mode không khi vừa vào web
if (localStorage.getItem('liteMode') === 'on') {
    document.body.classList.add('lite-mode');
}

window.addEventListener('load', async () => {
    // 1. Setup UI
    initParticles();
    setTimeout(() => document.getElementById('preloader')?.classList.add('hidden'), 800);

    // 2. Setup Modals Close Logic
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
        m.querySelectorAll('.close-modal').forEach(b => b.onclick = () => m.classList.remove('active'));
    });

    window.showCustomModal = showCustomModal;

    setupAuthForms();

    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const desktopLinks = document.getElementById('nav-links');

    if (mobileBtn && mobileMenu && desktopLinks) {
        // 1. Tạo link cho mobile từ menu desktop (để không phải viết lại HTML)
        const links = desktopLinks.querySelectorAll('a');
        let mobileHtml = '';

        links.forEach(link => {
            const target = link.getAttribute('data-nav');
            const text = link.innerText;
            const href = link.getAttribute('href'); // Lấy link gốc (VD: https://bans...)
            const targetAttr = link.getAttribute('target') === '_blank' ? 'target="_blank"' : '';

            if (target) {
                // Nếu là link chuyển Tab nội bộ (Có data-nav)
                mobileHtml += `<a href="#${target}" 
                    class="nav-link block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg font-bold title-font transition mb-1" 
                    data-nav="${target}">
                    ${text}
                </a>`;
            } else {
                // NẾU LÀ LINK NGOÀI (Nút Xử Phạt không có data-nav)
                mobileHtml += `<a href="${href}" ${targetAttr} 
                    class="nav-link block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg font-bold title-font transition mb-1">
                    ${text}
                </a>`;
            }
        });
        mobileMenu.innerHTML = mobileHtml;

        // 2. Bắt sự kiện click nút Menu
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // 3. Tự động đóng menu khi click vào link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // 3. Setup Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.getAttribute('data-nav');

            if (!target) return;

            e.preventDefault();

            // Active Link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show Section
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${target}`).classList.add('active');

            // Render content khi chuyển tab
            if (target === 'news') renderNews();
            if (target === 'guide') renderGuides();
            if (target === 'forum') renderForum('approved');
            if (target === 'admin') renderAdminTable();
            if (target === 'ranking') renderRanking();
            if (target === 'giveaway') renderGiveaways();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Tính năng: Hiển thị trước ảnh đại diện khi vừa chọn file
    document.getElementById('edit-avatar-file')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const preview = document.getElementById('edit-avatar-preview');
            preview.src = URL.createObjectURL(file);
            preview.classList.remove('hidden');
        }
    });

    // 4. Setup Profile Save (Đã nâng cấp Upload ảnh & Auto Reload UI)
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const statusText = document.getElementById('avatar-upload-status');

        btn.innerHTML = " Đang xử lý...";
        btn.disabled = true;

        try {
            // Mặc định lấy lại avatarUrl cũ đang có sẵn
            let avatarUrl = document.getElementById('edit-avatar').value;

            const fileInput = document.getElementById('edit-avatar-file');
            const file = fileInput.files[0];

            // Nếu người dùng CÓ chọn file ảnh mới -> Bắt đầu Upload
            if (file) {
                statusText.classList.remove('hidden');
                statusText.innerText = ' Đang tải ảnh lên...';
                statusText.className = "text-xs mt-2 text-yellow-400 font-bold block animate-pulse";

                avatarUrl = await uploadImage(file);

                statusText.innerText = 'Tải ảnh xong!';
                statusText.className = "text-xs mt-2 text-green-400 font-bold block";
            }

            // Gọi hàm update Profile của Firebase với link avatar (cũ hoặc mới upload)
            const newName = document.getElementById('edit-name').value.trim();
            const discordLink = document.getElementById('edit-discord-link').value.trim();
            const websiteLink = document.getElementById('edit-website-link').value.trim();
            await updateUserProfile(newName, avatarUrl, discordLink, websiteLink);

            if (currentUserData) {
                currentUserData.discordLink = discordLink;
                currentUserData.websiteLink = websiteLink;
            }

            if (currentUser) {
                // Gọi lại hàm để reload UI
                handleAuthUI(currentUser, currentRole, currentUserData);
            }

            showCustomModal("THÀNH CÔNG", "Hồ sơ đã được cập nhật!", "info");
            document.getElementById('profile-modal').classList.remove('active');

            // Reset form ảnh sau khi update thành công
            fileInput.value = '';
            statusText.classList.add('hidden');

        } catch (err) {
            showCustomModal("LỖI", err.message, "danger");
            if (statusText) {
                statusText.innerText = ' Lỗi tải ảnh!';
                statusText.className = "text-xs mt-2 text-red-500 font-bold block";
            }
        }
        finally {
            btn.innerHTML = "LƯU THAY ĐỔI ";
            btn.disabled = false;
        }
    });

    // 6. Setup Create Post
    document.getElementById('create-post-trigger')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('active');
    });

    document.getElementById('forum-post-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('forum-title').value;
        const content = document.getElementById('forum-content').value;
        try {
            const status = ['admin', 'dev'].includes(currentRole) ? 'approved' : 'pending';
            await createPost('forum_posts', { title, content, status, authorRole: currentRole });
            showCustomModal(status === 'approved' ? "ĐĂNG BÀI THÀNH CÔNG" : "ĐÃ GỬI DUYỆT", status === 'approved' ? "Bài viết đã được đăng!" : "Bài viết đang chờ admin duyệt.", "info");
            document.getElementById('post-modal').classList.remove('active');
            renderForum(status === 'approved' ? 'approved' : 'pending');
        } catch (e) { showCustomModal("LỖI ĐĂNG BÀI", e.message, "danger"); }
    });

    // 7. Setup Create Giveaway (Admin)
    document.getElementById('create-giveaway-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('gw-title').value;
        const prize = document.getElementById('gw-prize').value;
        const endtime = document.getElementById('gw-endtime').value;

        const btn = e.target.querySelector('button');
        btn.innerText = " ĐANG TẠO...";
        btn.disabled = true;

        try {
            await createGiveaway(title, prize, endtime);
            showCustomModal("THÀNH CÔNG", "Đã khởi tạo sự kiện Giveaway mới!", "info");
            document.getElementById('create-giveaway-modal').classList.remove('active');
            renderGiveaways();
            e.target.reset();
        } catch (err) {
            showCustomModal("LỖI", err.message, "danger");
        } finally {
            btn.innerText = "TẠO NGAY ";
            btn.disabled = false;
        }
    });

    // 8. Setup Search Admin
    document.getElementById('user-search')?.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.user-row').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    // 8. Load Content & Auth
    renderNews();
    renderGuides();
    renderForum('approved');
    renderStaff();
    renderRanking();
    updateServerStatus();
    subscribeToAuth(handleAuthUI);

});

// Các sự kiện click nút trang chủ
document.getElementById('copy-ip-btn').onclick = window.copyServerIP;
document.getElementById('discord-btn').onclick = window.openDiscord;