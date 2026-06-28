import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, arrayUnion, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 2. CONFIGURATION
export const defaultConfig = {
    server_name: "Cornmc.vn",
    server_ip: "cornmc.vn",
    discord_link: "https://discord.gg/cUsA2K4Cpz",
    welcome_title: "Chào mừng đến với Cornmc.vn",
    welcome_description: "Thế giới sinh tồn đầy thử thách và sáng tạo!"
};


const firebaseConfig = {
    apiKey: "AIzaSyAfQZr63_aYH_tqxGEuBupqKPzNAxoQEOw",
    authDomain: "cornminer-edb42.firebaseapp.com",
    projectId: "cornminer-edb42",
    storageBucket: "cornminer-edb42.firebasestorage.app",
    messagingSenderId: "679321936018",
    appId: "1:679321936018:web:01e4660bd723ab2ae8064b",
    measurementId: "G-T4B1T6L981"
};

// 3. INIT FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==========================================
// A. AUTHENTICATION FUNCTIONS
// ==========================================

export const getCurrentUser = () => auth.currentUser;

// Theo dõi trạng thái đăng nhập
export function subscribeToAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, "users", user.uid);
                const snap = await getDoc(userRef);
                let role = 'member';
                let dbData = {}; 

                if (snap.exists()) {
                    dbData = snap.data();
                    role = dbData.role || 'member';
                    localStorage.setItem('cached_user_role', role);
                    localStorage.setItem('cached_user_name', user.displayName);
                } else {
                   
                    dbData = {
                        username: user.displayName || "User",
                        email: user.email,
                        photoURL: user.photoURL,
                        role: 'member',
                        joinedAt: serverTimestamp()
                    };
                    await setDoc(userRef, dbData);
                }
                
                callback(user, role, dbData);
            } catch (e) {
                callback(user, 'member', {});
            }
        } else {
            callback(null, 'guest', null);
        }
    });
}

// Đăng nhập: Chấp nhận cả Tên nhân vật HOẶC Email thật
export async function loginUser(input, password) {
    let email = input.trim();
    // Nếu không có @, tự động coi là user ảo
    if (!email.includes('@')) {
        email = `${email.toLowerCase()}@cornmc.vn`;
    }
    return await signInWithEmailAndPassword(auth, email, password);
}

// Đăng ký: CHỈ CẦN USERNAME + PASSWORD
export async function registerUser(username, password) {
    const fakeEmail = `${username.trim().toLowerCase()}@cornmc.vn`;
    
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
    await updateProfile(cred.user, { displayName: username });
    
    // Lưu vào Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
        username: username,
        email: fakeEmail, // Lưu email ảo để quản lý
        role: 'member',
        photoURL: null, // Để null, UI sẽ tự lấy skin Minecraft
        joinedAt: serverTimestamp()
    });
    return cred.user;
}

// Quên mật khẩu (Chỉ dùng được nếu User đăng ký bằng Google hoặc Email thật sau này)
export async function resetPassword(email) {
    return await sendPasswordResetEmail(auth, email);
}

export async function loginGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

export async function loginEmail(email, password) {
    return await signInWithEmailAndPassword(auth, `${email}@cornmc.vn`, password);
}

export async function registerEmail(username, password) {
    const cred = await createUserWithEmailAndPassword(auth, `${username}@cornmc.vn`, password);
    await updateProfile(cred.user, { displayName: username });
    // Tạo data user
    await setDoc(doc(db, "users", cred.user.uid), {
        username: username,
        role: 'member',
        photoURL: null,
        joinedAt: serverTimestamp()
    });
    return cred.user;
}

export async function logout() {
    return await signOut(auth);
}

export async function updateUserProfile(displayName, photoURL, discordLink, websiteLink) {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");

    // Update Auth
    await updateProfile(user, { displayName, photoURL });

    // Update Firestore, bao gồm các trường mới
    // Sử dụng toán tử spread (...) để merge các trường mới vào object data
    // Nếu discordLink/websiteLink là undefined, chúng sẽ không được thêm vào object
    const userRef = doc(db, "users", user.uid);
    const updateData = { username: displayName, photoURL: photoURL };
    if (discordLink !== undefined) updateData.discordLink = discordLink;
    if (websiteLink !== undefined) updateData.websiteLink = websiteLink;
    await updateDoc(userRef, updateData);
}

// ==========================================
// B. DATA FETCHING (POSTS, USERS, ETC)
// ==========================================
// Lấy danh sách tin tức
export async function fetchNews() {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy danh sách hướng dẫn
export async function fetchGuides() {
    const q = query(collection(db, "guides"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy danh sách bài viết diễn đàn theo trạng thái
export async function fetchForumPosts(status) {
    const q = query(collection(db, "forum_posts"), where("status", "==", status), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy danh sách Users (Admin Panel)
export async function fetchAllUsers() {
    const q = query(collection(db, "users"), orderBy("joinedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy danh sách thành viên Staff (Media, Helper, Dev, Admin)
export async function fetchStaffMembers() {
    const staffRoles = ['media', 'helper', 'staff','dev', 'admin'];
    const q = query(collection(db, "users"), where("role", "in", staffRoles), orderBy("role", "desc"), orderBy("joinedAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


export async function fetchMyPosts(uid) {
    const q = query(
        collection(db, "forum_posts"), 
        where("authorId", "==", uid), 
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==========================================
// C. DATA MUTATION (ADD, UPDATE, DELETE)
// ==========================================

export async function createPost(collectionName, data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    return await addDoc(collection(db, collectionName), {
        ...data,
        author: user.displayName,
        authorId: user.uid,
        createdAt: serverTimestamp()
    });
}

export async function deleteDocument(collectionName, docId) {
    return await deleteDoc(doc(db, collectionName, docId));
}

export async function editDocument(collectionName, docId, data) {
    return await updateDoc(doc(db, collectionName, docId), data);
}

// Upload Hình Ảnh Lên ImgBB
export async function uploadImage(file) {
    const IMGBB_API_KEY = "c0a95bc4dd1aa09966652767e131ef5c";
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            return data.data.url; // Trả về link ảnh trực tiếp (direct link)
        } else {
            throw new Error(data.error.message || "Lỗi tải ảnh lên ImgBB");
        }
    } catch (error) {
        console.error("Lỗi upload ảnh:", error);
        throw error;
    }
}

// Comments
export async function fetchComments(postId) {
    const q = query(collection(db, "forum_posts", postId, "comments"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addComment(postId, content, role) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    return await addDoc(collection(db, "forum_posts", postId, "comments"), {
        content: content,
        uid: user.uid,
        username: user.displayName,
        avatar: user.photoURL || `https://mc-heads.net/avatar/${user.displayName}`,
        role: role,
        createdAt: serverTimestamp()
    });
}

export async function deleteComment(postId, commentId) {
    return await deleteDoc(doc(db, "forum_posts", postId, "comments", commentId));
}

// User Management (Admin)
export async function deleteUserAndData(uid) {
    return await deleteDoc(doc(db, "users", uid));
}

// ==========================================
// D. NHÂN SỰ & BÁO CÁO (INTERNAL SYSTEM)
// ==========================================

// Gửi báo cáo công việc
export async function submitWorkReport(data) {
    const user = auth.currentUser;
    const role = localStorage.getItem('cached_user_role') || 'member';
    
    return await addDoc(collection(db, "work_reports"), {
        ...data,
        uid: user.uid,
        author: user.displayName,
        authorRole: role, 
        status: 'pending',
        createdAt: serverTimestamp()
    });
}

// Lấy danh sách báo cáo (Cho Staff/Admin)
export async function fetchAllWorkReports() {
    const q = query(collection(db, "work_reports"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy lịch sử lương thưởng cá nhân
export async function fetchMyPayroll(uid) {
    const q = query(collection(db, "payroll_history"), where("uid", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Tạo phiếu lương/thưởng (Chỉ Admin)
export async function createPayrollEntry(targetUid, amount, reason) {
    await addDoc(collection(db, "payroll_history"), {
        uid: targetUid,
        amount: Number(amount),
        reason: reason,
        createdAt: serverTimestamp()
    });
    
    // Tự động tạo một thông báo cho người nhận
    return await addDoc(collection(db, "notifications"), {
        uid: targetUid,
        message: `💰 Bạn vừa nhận được ${Number(amount).toLocaleString()} coin cho: ${reason}`,
        isRead: false,
        createdAt: serverTimestamp()
    });
}

// ==========================================
// E. HỆ THỐNG GIAO VIỆC (TASKS)
// ==========================================

// Tạo nhiệm vụ mới (Admin/Quản lý)
export async function assignTask(title, description, targetRole) {
    const user = auth.currentUser;
    return await addDoc(collection(db, "tasks"), {
        title: title,
        description: description,
        targetRole: targetRole, // 'media', 'helper', 'staff', 'dev', 'all'
        assigner: user.displayName,
        status: 'open',
        createdAt: serverTimestamp()
    });
}

// Lấy danh sách nhiệm vụ (Lọc trực tiếp bằng Code để tránh lỗi Index Firebase)
export async function fetchTasksForRole(role) {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const allTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Nếu là Admin/Manager xem hết, nếu là nhân viên thì chỉ xem việc của bộ phận mình hoặc việc chung
    if (['admin', 'dev', 'staff'].includes(role)) return allTasks;
    return allTasks.filter(t => t.targetRole === role || t.targetRole === 'all');
}

// Kiểm tra xem ID Discord đã có ai liên kết chưa
export async function checkDiscordIdExists(discordId) {
    const q = query(collection(db, "users"), where("discordLink", "==", discordId));
    const snap = await getDocs(q);
    return !snap.empty; // Trả về true nếu ID này đã tồn tại trong database
}

// ==========================================
// G. HỆ THỐNG GIVEAWAY & SỰ KIỆN
// ==========================================

// 1. Tạo Giveaway mới (Chỉ Admin)
export async function createGiveaway(title, prize, endTimeStr) {
    return await addDoc(collection(db, "giveaways"), {
        title: title,
        prize: prize,
        endTime: endTimeStr,
        participants: [], // Mảng chứa ID những người tham gia
        status: 'active',
        createdAt: serverTimestamp()
    });
}

// Thay thế hàm fetchActiveGiveaways cũ bằng hàm này
export async function fetchActiveGiveaways() {
    // Đã gỡ bỏ bộ lọc "status" để hiển thị cả sự kiện đã kết thúc
    const q = query(collection(db, "giveaways"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 3. Nút Báo Danh (Kiểm tra Discord trước khi cho tham gia)
export async function joinGiveaway(giveawayId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Vui lòng đăng nhập!");

    // BƯỚC KIỂM TRA QUAN TRỌNG: Check xem đã liên kết Discord chưa
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    const discordId = userSnap.data()?.discordLink;
    // Kiểm tra xem ID có tồn tại và đúng định dạng số ID Discord không
    if (!discordId || !/^\d{17,19}$/.test(discordId)) {
        throw new Error("NOT_VERIFIED"); // Ném ra mã lỗi riêng để UI xử lý
    }

    const giveawayRef = doc(db, "giveaways", giveawayId);
    const gwSnap = await getDoc(giveawayRef);
    const participants = gwSnap.data()?.participants || [];

    if (participants.includes(user.uid)) {
        throw new Error("ALREADY_JOINED");
    }

    // Nhét UID của người chơi vào mảng danh sách
    await updateDoc(giveawayRef, {
        participants: arrayUnion(user.uid)
    });
}

// 4. Chốt Giveaway (Quay random người trúng thưởng)
export async function endGiveaway(giveawayId) {
    const giveawayRef = doc(db, "giveaways", giveawayId);
    const gwSnap = await getDoc(giveawayRef);
    if (!gwSnap.exists()) throw new Error("Không tìm thấy sự kiện!");

    const data = gwSnap.data();
    const participants = data.participants || [];
    let winnerName = "Không có ai tham gia";
    let winnerUid = null;
    let winnerDiscordId = null; // Thêm biến lưu ID Discord

    if (participants.length > 0) {
        // Quay random 1 người trong danh sách
        winnerUid = participants[Math.floor(Math.random() * participants.length)];
        
        // Lấy Tên và ID Discord của người đó
        const userSnap = await getDoc(doc(db, "users", winnerUid));
        if (userSnap.exists()) {
            winnerName = userSnap.data().username || "Ẩn danh";
            winnerDiscordId = userSnap.data().discordLink; // Lấy ID để lát nữa Bot Tag tên
        }
    }

    // Cập nhật trạng thái sự kiện
    await updateDoc(giveawayRef, {
        status: 'closed',
        winnerUid: winnerUid,
        winnerName: winnerName,
        endedAt: serverTimestamp()
    });

    if (winnerDiscordId) {
        await addDoc(collection(db, "discord_dms"), {
            discordId: winnerDiscordId,
            type: 'giveaway_winner',
            title: data.title,
            prize: data.prize,
            winnerName: winnerName,
            createdAt: serverTimestamp()
        });
    }

    // Trả về một Gói dữ liệu (Gồm Tên người thắng, Giải thưởng, Tên sự kiện, ID Discord)
    return { winnerName, title: data.title, prize: data.prize, winnerDiscordId };
}

// ==========================================
// H. HỆ THỐNG DISCORD WEBHOOK
// ==========================================
export async function sendDiscordWebhook(message, embeds = []) {
    // 🔴 BẮT BUỘC: THAY LINK WEBHOOK CỦA BẠN VÀO ĐÂY
    // (Lấy trong Cài đặt Kênh Discord -> Tích hợp -> Webhook)
    const webhookUrl = "https://discord.com/api/webhooks/xxxx/yyyy"; 
    
    if (!webhookUrl || webhookUrl.includes("xxxx")) {
        console.warn("Chưa cấu hình Link Webhook Discord!");
        return;
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: message,
                embeds: embeds
            })
        });
    } catch (error) {
        console.error("Lỗi gửi Webhook Discord:", error);
    }
}