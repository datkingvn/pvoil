# Game Show - Đường lên đỉnh Olympia

Dự án Next.js mô phỏng trải nghiệm game show thi đấu với UI/UX giống trường quay thật.

## 🚀 Cài đặt

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

## 📋 Tính năng

### 🎯 3 Màn hình chính

1. **`/stage`** - Màn hình thi (dành cho thí sinh)
   - Hiển thị câu hỏi với hiệu ứng LED wall
   - Nút bấm chuông với animation
   - Timer với cảnh báo khi < 5 giây
   - 4 thí sinh với trạng thái realtime

2. **`/control`** - Màn hình điều khiển (dành cho MC)
   - Chọn vòng thi và câu hỏi
   - Điều khiển timer, mở câu, khóa chuông, hiện đáp án
   - Chấm điểm nhanh cho từng thí sinh
   - Preview stage thu nhỏ
   - Hỗ trợ phím tắt đầy đủ

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

- **Next.js 15** (App Router)
- **React 19** + **TypeScript**
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
│   ├── page.tsx            # Landing page
│   ├── stage/
│   │   └── page.tsx        # Màn hình thi
│   ├── control/
│   │   └── page.tsx        # Màn hình điều khiển
│   └── scoreboard/
│       └── page.tsx         # Bảng điểm
├── components/
│   ├── Timer.tsx           # Component timer
│   ├── BuzzButton.tsx      # Nút bấm chuông
│   ├── PlayerCard.tsx      # Card thí sinh
│   ├── QuestionDisplay.tsx # Hiển thị câu hỏi
│   ├── FlashOverlay.tsx    # Flash correct/wrong
│   └── Confetti.tsx        # Confetti effect
└── lib/
    ├── types.ts            # TypeScript types
    ├── questions.ts        # Mock data câu hỏi
    ├── store.ts            # Zustand store
    └── sounds.ts           # Sound manager
```

## 🎬 Demo

1. Mở 2 tab trình duyệt:
   - Tab 1: `http://localhost:3000/control` (MC)
   - Tab 2: `http://localhost:3000/stage` (Thí sinh)

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

- Tất cả data là mock, không có backend/database
- State được persist trong localStorage
- Âm thanh sử dụng Web Audio API (không cần file audio)
- Không sử dụng logo/brand/asset của chương trình thật

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

