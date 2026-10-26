# Văn phòng ảo 3D cho đội AI

Biến các phiên **Claude Code** và **Codex** đang chạy trên máy bạn thành một văn phòng 3D sống động. Mỗi phiên là một nhân viên robot có bàn riêng: đang làm thì gõ phím, xong việc thì báo cáo. Phiên này nhắn cho phiên kia thì robot đứng dậy đi sang bàn người nhận. Bạn giao việc thì cả nhóm ra phòng họp.

Kèm theo là ba màn hình lớn trên tường, mỗi màn hình mở riêng được:

- **Bảng điều hành**: ai đang làm, ai rảnh, ai đang báo bị chặn, câu trả lời mới nhất của từng phiên.
- **Hiệu suất**: số token từng phiên dùng theo giờ và theo ngày, điểm xếp loại A/B/C/D, quỹ Codex tuần.
- **Tin nhắn**: việc bạn giao và tin các phiên gửi nhau trong 24 giờ.

> **Chỉ đọc, chạy tại máy bạn.** Văn phòng chỉ đọc nhật ký mà Claude Code và Codex vốn tự ghi trong `~/.claude` và `~/.codex`. Nó không gửi dữ liệu đi đâu, không sửa file nào và không cần khóa API. Trước khi hiện, mọi chuỗi giống khóa (token, password, `sk-…`, `ghp_…`) đều được che.

---

## 1. Cần có gì

| Thứ cần | Ghi chú |
|---|---|
| **Node.js 18 trở lên** | Tải ở https://nodejs.org (chọn bản LTS). Kiểm bằng lệnh `node -v`. |
| **Claude Code** hoặc **Codex** (hoặc cả hai) | Đã dùng ít nhất một lần trên máy, để có nhật ký cho văn phòng đọc. |
| **Git** | Để tải mã về. Không có Git thì tải file ZIP ở nút **Code → Download ZIP** trên GitHub. |
| Trình duyệt Chrome, Edge hoặc Safari | Văn phòng 3D dùng WebGL. |

Văn phòng **không cần `npm install`**: nó không dùng thư viện ngoài nào. Thư viện 3D (three.js) được trình duyệt tải từ CDN.

## 2. Cài đặt: 3 lệnh

```bash
git clone https://github.com/<tai-khoan>/van-phong-ao-3d.git
cd van-phong-ao-3d
npm run setup
```

`npm run setup` sẽ hỏi bạn 4 câu:

1. **Theo dõi dự án nào.** Máy tự liệt kê các thư mục đã dùng Claude Code hoặc Codex trong 14 ngày qua; bạn chỉ cần gõ số thứ tự. Muốn theo dõi nhiều dự án thì gõ `1,3`. Để trống là theo dõi mọi dự án trên máy.
2. **Tên văn phòng**, ví dụ `Văn phòng Vin Media`.
3. **Bạn muốn được gọi là gì**, ví dụ `Anh Hải`. Bạn ngồi ở Phòng Giám đốc.
4. **Có muốn xem trên điện thoại qua Internet không.** Trả lời `c` thì máy tạo một **khóa xem**; hãy ghi khóa này lại.

Trả lời xong, máy ghi ra file `config.json`.

## 3. Chạy

```bash
npm start
```

Rồi mở **http://localhost:7788** trên trình duyệt.

- Kéo chuột để xoay, cuộn hoặc chụm hai ngón để phóng to.
- Bấm vào tên một robot để xem phiên đó đang làm gì và câu trả lời mới nhất.
- Ba nút trên cùng dùng để phóng vào từng màn hình: **◧ Hiệu suất**, **Xem màn hình lớn**, **Tin nhắn ◨**. Bấm **Về văn phòng 3D** hoặc phím `Esc` để quay lại.
- Muốn tắt văn phòng thì bấm `Ctrl + C` trong cửa sổ đang chạy.

Mở thêm một phiên Claude Code hay Codex trong thư mục dự án thì trong vòng 5 giây sẽ có **nhân viên mới** vào văn phòng, kèm lời chào. Phiên im quá 24 giờ thì tự rời văn phòng; đổi mốc này bằng `keepHours`.

## 4. Xem trên điện thoại

**Cách 1: cùng mạng Wi-Fi.** Trong `config.json`, đổi `"host": "127.0.0.1"` thành `"host": "0.0.0.0"` và đặt `accessKey`. Chạy lại `npm start`, rồi trên điện thoại mở `http://<IP máy tính>:7788`. Xem IP máy tính bằng lệnh `ipconfig` trên Windows hoặc `ifconfig` trên macOS.

**Cách 2: qua Internet, ở đâu cũng xem được.** Cách này dùng đường hầm Cloudflare miễn phí và không cần tài khoản.

1. Cài cloudflared một lần:
   - Windows: `winget install --id Cloudflare.cloudflared`
   - macOS: `brew install cloudflared`
2. Giữ cửa sổ `npm start` đang chạy. Mở cửa sổ thứ hai và chạy:
   - Windows: `powershell -ExecutionPolicy Bypass -File scripts\xem-tren-dien-thoai.ps1`
   - macOS / Linux: `sh scripts/xem-tren-dien-thoai.sh`
3. Màn hình hiện một link dạng `https://xxxx.trycloudflare.com`. Mở link đó trên điện thoại và nhập khóa xem **một lần**; điện thoại nhớ khóa 30 ngày.

> Script sẽ **không chạy** nếu chưa có khóa xem, vì ai có link cũng sẽ đọc được câu trả lời của các phiên AI của bạn. Link sẽ đổi mỗi lần bạn mở lại đường hầm.

## 5. Văn phòng xếp chỗ thế nào

| Phòng | Ai ngồi |
|---|---|
| Phòng Giám đốc | Bạn. Bạn gõ việc vào phiên nào thì Giám đốc "nói" với phiên đó, và cả nhóm ra phòng họp. |
| Phòng Quản lý & Điều phối | Phiên có tên chứa: quản lý, manager, lead, trưởng nhóm, điều phối, PM |
| Phòng Kiểm tra | Phiên có tên chứa: review, duyệt, kiểm tra, test, QA |
| Studio Claude | Các phiên Claude Code còn lại |
| Khu kỹ sư Codex | Các phiên Codex còn lại |
| Phòng máy chủ | Sáng lên theo số người đang làm |
| Phòng họp | Họp tự động: khi Giám đốc giao việc; khi có tin báo GẤP/CHẶN (họp sự cố); khi có tin REVIEW/duyệt (họp review); khi một phiên giao việc cho từ 2 phiên trở lên trong 5 phút (họp giao việc) |

**Tên nhân viên** lấy từ tên phiên: tên bạn đặt bằng `/rename` trong Claude Code, hoặc tên thread trong Codex. Chưa đặt tên thì nhân viên hiện là `Claude 1a2b3c4d`.

**Tự đặt tên, chức danh và phòng** trong `config.json`:

```json
"staff": [
  { "match": "quản lý", "role": "Quản lý dự án", "room": "lead" },
  { "match": "019e544d", "name": "Kỹ sư Backend", "role": "Code API" }
]
```

- `match` là một phần tên phiên, hoặc 8 ký tự đầu của mã phiên (mã này hiện khi bấm vào robot).
- `room` nhận một trong các giá trị: `lead`, `review`, `claude`, `codex`.
- Muốn giấu một phiên thì thêm mã đầy đủ của phiên đó vào `"hide": []`.

## 6. Điểm hiệu suất được chấm thế nào

Thang 100 điểm, chỉ dùng số đo được trong nhật ký:

| Phần | Điểm | Cách đo |
|---|---|---|
| Kết quả | 40 | Số lượt việc làm xong trong 24 giờ (Claude: lượt trả lời kết thúc; Codex: `task_complete`), mỗi lượt +4 |
| Tin cậy | 20 | Tỉ lệ lệnh/công cụ chạy không lỗi trong 24 giờ (lỗi từ 25% trở lên = 0) |
| Chăm chỉ | 20 | Số giờ có hoạt động trong 24 giờ (từ 10 giờ trở lên = đủ) |
| Tiết kiệm | 20 | Token mới mỗi giờ làm so với mức giữa của các phiên cùng loại (bằng hoặc thấp hơn = đủ; gấp 4 lần = 0) |

Xếp loại: **A** từ 80 điểm, **B** từ 65, **C** từ 50, **D** dưới 50. Phiên làm dưới 1 giờ trong 7 ngày thì chưa xếp loại. Điểm chỉ là số đo tham khảo, không thay việc đánh giá chất lượng công việc.

## 7. Bảng cấu hình `config.json`

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `title`, `subtitle` | Văn phòng AI | Tên hiện trên văn phòng |
| `ownerName` | Giám đốc | Tên của bạn trong văn phòng |
| `projects` | `[]` | Danh sách thư mục dự án cần theo dõi (tính cả thư mục con và worktree). Để trống là mọi dự án |
| `port` | 7788 | Cổng web |
| `host` | 127.0.0.1 | `127.0.0.1` thì chỉ máy này xem được; `0.0.0.0` thì máy khác trong mạng cũng xem được (nên đặt `accessKey`) |
| `accessKey` | `""` | Khóa xem. Có khóa thì phải nhập một lần mới xem được |
| `keepHours` | 24 | Phiên im quá số giờ này thì rời văn phòng |
| `staff`, `hide` | `[]` | Đặt tên, chức danh và phòng; giấu phiên |
| `claudeDir`, `codexDir` | `~/.claude`, `~/.codex` | Đổi khi bạn để nhật ký ở chỗ khác |

> `config.json` đã có sẵn trong `.gitignore`. **Đừng đưa file này lên GitHub**, vì nó chứa khóa xem và đường dẫn trên máy bạn.

## 8. Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `Chưa có config.json` | Chạy `npm run setup` trước `npm start`. |
| Văn phòng trống, không có robot nào | Mở một phiên Claude Code hoặc Codex **trong đúng thư mục dự án** đã chọn lúc setup. Kiểm tra lại `projects` trong `config.json` (dùng dấu `/`, ví dụ `D:/du-an`). |
| `EADDRINUSE` | Cổng 7788 đang bận. Đổi `port` trong `config.json`, ví dụ thành 7789. |
| Trang trắng, không có hình 3D | Trình duyệt chặn WebGL hoặc máy không có mạng để tải three.js. Thử Chrome hoặc Edge bản mới. |
| Điện thoại báo không vào được | Kiểm tra cửa sổ `npm start` còn chạy không, và đã nhập đúng khóa xem chưa. |
| Robot không đi sang bàn nhau | Các phiên phải nhắn nhau thật, bằng SendMessage của Claude Code hoặc cầu nối PEER MESSAGE của Codex. Tin bạn gõ thì hiện là "Giám đốc nói". |

## 9. Cấu trúc mã

```
server.js            máy chủ: tìm phiên, đọc nhật ký, đẩy trạng thái mỗi giây
lib/perf.js          đếm token theo giờ/ngày, chấm điểm
setup.js             hỏi–đáp tạo config.json
public/index.html    văn phòng 3D (three.js)
public/board.html    bảng điều hành
public/hieusuat.html hiệu suất & token
public/tinnhan.html  tin nhắn 24 giờ
scripts/             mở đường hầm xem trên điện thoại
```

## Giấy phép

MIT: dùng, sửa và chia sẻ tự do. Xem file `LICENSE`.
