# Game Show - Đường lên đỉnh Olympia

Dự án Next.js mô phỏng trải nghiệm game show thi đấu với UI/UX giống trường quay thật.

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình MongoDB

Tạo file `.env.local` trong thư mục gốc:

```env
MONGODB_URI=mongodb://localhost:27017/pvoil-olympia
```

Hoặc nếu sử dụng MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pvoil-olympia
```

### 3. Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

## 📋 Tính năng

### 🎯 3 Màn hình chính

1. **`/login`** - Trang đăng nhập (dành cho đội thi)
   - Đăng nhập với tên đăng nhập và mật khẩu
   - Tự động chuyển đến `/stage` sau khi đăng nhập thành công

2. **`/stage`** - Màn hình thi (dành cho thí sinh - yêu cầu đăng nhập)
   - Hiển thị câu hỏi với hiệu ứng LED wall
   - Nút bấm chuông với animation
   - Timer với cảnh báo khi < 5 giây
   - 4 thí sinh với trạng thái realtime
   - Hiển thị thông tin đội thi đã đăng nhập
   - Nút đăng xuất

3. **`/control`** - Màn hình điều khiển (dành cho MC)
   - Chọn vòng thi và câu hỏi
   - Điều khiển timer, mở câu, khóa chuông, hiện đáp án
   - Chấm điểm nhanh cho từng thí sinh
   - Preview stage thu nhỏ
   - Hỗ trợ phím tắt đầy đủ
   - **Quản lý đội thi**: Tạo và quản lý tài khoản cho các đội thi tại `/control/teams`

3. **`/scoreboard`** - Bảng xếp hạng
   - Xếp hạng thí sinh theo điểm số
   - Timeline log các hoạt động
   - Animation khi thay đổi thứ hạng

### 🎨 UI/UX Features

- **Stage Lighting**: Nền tối với glow neon, spotlight gradient
- **Countdown Timer**: Đổi màu đỏ khi < 5s, rung nhẹ, beep mỗi giây
- **Buzz Button**: Animation scale + glow khi nhấn, lock 2s
- **Question Reveal**: Hiệu ứng wipe/scanline như LED wall
- **Correct/Wrong Flash**: Màn hình flash xanh/đỏ 200ms + sound
- **Score Impact**: Số điểm bay lên + shake panel
- **Confetti**: Hiệu ứng confetti khi trả lời đúng (CSS-based)
- **Fullscreen**: Hỗ trợ toàn màn hình

### 🎮 Điều khiển

#### Phím tắt (trong `/control`):
- `Space`: Start/Pause timer
- `O`: Mở câu hỏi
- `L`: Khóa chuông
- `R`: Hiện đáp án
- `N`: Câu tiếp theo
- `1/2/3/4`: Chọn thí sinh A/B/C/D
- `+/-`: Cộng/trừ điểm nhanh

### 🔄 Đồng bộ đa tab

Dự án sử dụng **BroadcastChannel API** để đồng bộ state realtime giữa các tab:
- Mở 1 tab `/control` và 1 tab `/stage`
- Khi MC thao tác ở `/control`, `/stage` cập nhật ngay lập tức
- Tự động fallback về localStorage events nếu BroadcastChannel không hỗ trợ

### 📦 Tech Stack

- **Next.js 16** (App Router)
- **React 19** + **TypeScript**
- **MongoDB** + **Mongoose** (database)
- **bcryptjs** (mã hóa mật khẩu)
- **TailwindCSS** + **tailwind-animate**
- **Framer Motion** (animations)
- **Zustand** (state management với persist localStorage)
- **React Hotkeys Hook** (phím tắt)
- **Howler** (âm thanh - sử dụng Web Audio API)
- **Lucide React** (icons)

### 🎯 4 Vòng thi

1. **Khởi động**: Câu hỏi nhanh (8 câu)
2. **Vượt chướng ngại vật**: Grid 4x4 với từ khóa (8 câu)
3. **Tăng tốc**: Chuỗi câu liên tiếp (8 câu)
4. **Về đích**: Chọn gói điểm (8 câu)

Mỗi vòng có mock data đầy đủ trong `/src/lib/questions.ts`.

## 📁 Cấu trúc dự án

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Landing page
│   ├── login/
│   │   └── page.tsx       # Trang đăng nhập đội thi
│   ├── stage/
│   │   └── page.tsx       # Màn hình thi (yêu cầu đăng nhập đội thi)
│   ├── control/
│   │   ├── page.tsx       # Màn hình điều khiển (yêu cầu đăng nhập MC)
│   │   ├── login/
│   │   │   └── page.tsx   # Trang đăng nhập/đăng ký MC
│   │   └── teams/
│   │       └── page.tsx   # Quản lý đội thi
│   ├── scoreboard/
│   │   └── page.tsx       # Bảng điểm
│   └── api/
│       ├── auth/
│       │   ├── login/     # API đăng nhập đội thi
│       │   ├── logout/    # API đăng xuất đội thi
│       │   ├── me/        # API kiểm tra session đội thi
│       │   └── mc/
│       │       ├── login/    # API đăng nhập MC
│       │       ├── logout/   # API đăng xuất MC
│       │       ├── me/       # API kiểm tra session MC
│       │       ├── register/ # API đăng ký MC
│       │       └── check/    # API kiểm tra đã có MC chưa
│       └── teams/
│           └── [id]/       # API quản lý đội thi
├── components/
│   ├── Timer.tsx           # Component timer
│   ├── BuzzButton.tsx      # Nút bấm chuông
│   ├── PlayerCard.tsx      # Card thí sinh
│   ├── QuestionDisplay.tsx # Hiển thị câu hỏi
│   ├── FlashOverlay.tsx    # Flash correct/wrong
│   └── Confetti.tsx        # Confetti effect
├── hooks/
│   ├── useAuth.ts          # Hook xác thực đội thi
│   ├── useMcAuth.ts        # Hook xác thực MC
│   └── useBroadcastSync.ts # Hook đồng bộ đa tab
├── lib/
│   ├── types.ts            # TypeScript types
│   ├── questions.ts        # Mock data câu hỏi
│   ├── store.ts            # Zustand store
│   ├── sounds.ts           # Sound manager
│   └── mongodb.ts          # Kết nối MongoDB
├── models/
│   ├── Team.ts             # Model đội thi
│   └── User.ts             # Model tài khoản MC
└── middleware.ts           # Middleware bảo vệ routes
```

## 🎬 Demo

### Bước 1: Tạo tài khoản MC (Lần đầu tiên)

1. Truy cập `http://localhost:3000/control/login`
2. Nếu chưa có MC nào, hệ thống sẽ hiển thị form **Đăng ký MC**
3. Tạo tài khoản MC đầu tiên:
   - Tên đăng nhập: Ví dụ "mc", "admin", ...
   - Mật khẩu: Tối thiểu 4 ký tự
4. Sau khi đăng ký thành công, tự động chuyển đến trang điều khiển

**Lưu ý**: Chỉ có thể đăng ký MC đầu tiên. Các lần sau sẽ chỉ hiển thị form đăng nhập.

### Bước 2: Tạo tài khoản đội thi (MC)

1. Sau khi đăng nhập MC, truy cập `http://localhost:3000/control`
2. Nhấn nút "Quản lý đội thi" ở góc trên bên phải
3. Tạo 4 đội thi với các mã A, B, C, D:
   - Tên đội thi: Ví dụ "Đội A", "Đội B", ...
   - Tên đăng nhập: Ví dụ "doia", "doib", ...
   - Mật khẩu: Tối thiểu 4 ký tự
   - Mã đội thi: Chọn A, B, C hoặc D

### Bước 3: Đăng nhập (Đội thi)

1. Truy cập `http://localhost:3000/login`
2. Đăng nhập với tên đăng nhập và mật khẩu đã tạo
3. Sau khi đăng nhập thành công, tự động chuyển đến `/stage`

### Bước 4: Chơi game

1. Mở 2 tab trình duyệt:
   - Tab 1: `http://localhost:3000/control` (MC)
   - Tab 2: `http://localhost:3000/stage` (Thí sinh - đã đăng nhập)

2. Ở tab `/control`:
   - Chọn vòng thi (ví dụ: "Khởi động")
   - Chọn một câu hỏi
   - Nhấn "Mở câu hỏi" (hoặc phím `O`)

3. Ở tab `/stage`:
   - Câu hỏi sẽ hiển thị ngay lập tức
   - Thí sinh có thể bấm chuông
   - MC có thể khóa chuông, hiện đáp án, chấm điểm

4. Xem bảng điểm tại `/scoreboard`

## 📝 Lưu ý

- **Database**: Sử dụng MongoDB để lưu trữ thông tin đội thi
- **Authentication**: Session được lưu trong HTTP-only cookie
- **Bảo mật**: Mật khẩu được mã hóa bằng bcrypt
- **State**: Game state được persist trong localStorage
- **Âm thanh**: Sử dụng Web Audio API (không cần file audio)
- **Không sử dụng**: Logo/brand/asset của chương trình thật

## 🔐 Authentication & Authorization

### MC (Người dẫn chương trình)
- **Bắt buộc đăng nhập** để truy cập `/control` và `/control/teams`
- **Đăng ký MC đầu tiên**: Tự động hiển thị form đăng ký nếu chưa có MC nào
- **Đăng nhập**: Tại `/control/login`
- **Session**: Lưu trong cookie `mc-session`, tự động hết hạn sau 7 ngày

### Đội thi
- **Bắt buộc đăng nhập** để truy cập `/stage`
- **Đăng nhập**: Tại `/login`
- **Tài khoản**: Được MC tạo tại trang quản lý đội thi
- **Session**: Lưu trong cookie `team-session`, tự động hết hạn sau 7 ngày

### Bảo mật
- Mật khẩu được mã hóa bằng **bcryptjs**
- Session lưu trong **HTTP-only cookie** (không thể truy cập từ JavaScript)
- Middleware tự động bảo vệ các routes yêu cầu authentication

## 🛠️ Development

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start
```

## 📄 License

MIT

