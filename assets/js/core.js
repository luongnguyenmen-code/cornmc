import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 2. CONFIGURATION
export const defaultConfig = {
    server_name: "CornMiner.top",
    server_ip: "cornminer.top",
    discord_link: "https://discord.gg/cUsA2K4Cpz",
    welcome_title: "Chào mừng đến với CornMiner.top",
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
const db = getFirestore(app);
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
                // Lấy Role từ Firestore
                const userRef = doc(db, "users", user.uid);
                const snap = await getDoc(userRef);
                let role = 'member';

                if (snap.exists()) {
                    role = snap.data().role || 'member';
                    // Cache lại để dùng cho lần sau
                    localStorage.setItem('cached_user_role', role);
                    localStorage.setItem('cached_user_name', user.displayName);
                } else {
                    // Tạo user mới nếu chưa có trong DB
                    await setDoc(userRef, {
                        username: user.displayName || "User",
                        email: user.email,
                        photoURL: user.photoURL,
                        role: 'member',
                        joinedAt: serverTimestamp()
                    });
                }
                callback(user, role);
            } catch (e) {
                callback(user, 'member');
            }
        } else {
            callback(null, 'guest');
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
    return await addDoc(collection(db, "work_reports"), {
        ...data,
        uid: user.uid,
        author: user.displayName,
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
