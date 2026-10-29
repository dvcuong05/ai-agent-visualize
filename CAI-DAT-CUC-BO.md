# Văn phòng ảo cho agent-virtual-office

Văn phòng chạy tại [http://localhost:7788](http://localhost:7788), theo dõi các phiên AI làm việc trong `E:/Workspaces/agent-virtual-office` và các thư mục con. Các phiên hoạt động trong 24 giờ gần nhất được hiển thị tự động.

Repo và bộ chạy nằm tại `E:/Workspaces/agent-virtual-office`, theo [hướng dẫn gốc](https://github.com/vinaichatbot-rgb/van-phong-ao-3d/blob/main/HUONG-DAN-CHO-AGENT.md). Máy dùng Node.js có sẵn, không cần `npm install`.

## Sử dụng

Mở `E:/Workspaces/agent-virtual-office` làm project trong Codex. Toàn bộ mã nguồn, thư mục Git, cấu hình và sổ điều phối đã được chuyển về đây. Cấu hình theo dõi dùng chính thư mục này. Bản sao ba tài liệu ban đầu nằm tại `data/migration-agent-virtual-office/`.

Mở địa chỉ trên để xem văn phòng. Máy chủ hiện chạy nền và chỉ lắng nghe tại `127.0.0.1:7788`.

Đổi ngôn ngữ bằng nút 🇬🇧 EN / 🇻🇳 VI ở góc trên bên phải. Lựa chọn được lưu trên trình duyệt và dùng chung cho các màn hình văn phòng.

## Tên tiếng Việt và English

Tên tiếng Anh là tùy chọn; để trống thì hệ thống dùng tên tiếng Việt. Trong `config.json`, cấu hình `titleEn`, `subtitleEn` và `ownerNameEn` cho tên văn phòng, dòng mô tả và tên chủ văn phòng. Trình cài đặt tương tác cũng hỏi tên English tùy chọn; khi dùng dòng lệnh, truyền `--title-en` và `--owner-en`.

Đổi nhãn phòng bằng cặp `vi`/`en` trong `roomLabels`, dùng mã phòng làm khóa (`ceo`, `manager`, `coord`, `g1`, `claude`, `dev`, `codex`, `lounge`). Trong danh sách `staff`, thêm `nameEn` và `roleEn` để dịch tên hiển thị và chức danh. Ví dụ cấu hình có trong `config.example.json`. Khởi động lại server sau khi sửa `config.json`.

Sau khi khởi động lại máy, chạy trong PowerShell và giữ cửa sổ này mở:

```powershell
Set-Location E:/Workspaces/agent-virtual-office
node server.js
```

Nếu văn phòng đang chạy thì không cần chạy thêm máy chủ. Với cách chạy trong cửa sổ PowerShell, nhấn `Ctrl+C` để dừng.

Để restart server đang chạy nền, mở PowerShell và chạy:

```powershell
$officePath = 'E:\Workspaces\agent-virtual-office'
$serverPath = (Join-Path $officePath 'server.js').Replace('\', '/')

Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.Replace('\', '/').Contains($serverPath) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId }

Set-Location $officePath
node server.js
```

Lệnh trên dừng tiến trình Node có đường dẫn tới `server.js` của dự án rồi chạy lại server trong cửa sổ hiện tại. Giữ cửa sổ PowerShell mở và refresh [văn phòng](http://localhost:7788/). Những lần restart tiếp theo trong cửa sổ này, nhấn `Ctrl+C` rồi chạy lại `node server.js`. Sau khi sửa `config.json`, cần restart để áp dụng cấu hình mới.

Kiểm tra server từ một cửa sổ PowerShell khác:

```powershell
Invoke-RestMethod http://127.0.0.1:7788/state
```

Server hoạt động khi lệnh trả về dữ liệu trạng thái, gồm danh sách `agents`.

## Cấu hình và sổ điều phối

- Cấu hình: `E:/Workspaces/agent-virtual-office/config.json`.
- Sổ điều phối: `E:/Workspaces/agent-virtual-office/data/`.
- Đội ngũ thực tế: `data/DOI-NGU.md` trong bộ chạy.
- Luật điều phối đã được chèn vào `AGENTS.md` và `CLAUDE.md` của dự án sau khi chủ dự án đồng ý. Bản gốc với đường dẫn đã điền nằm tại `data/DOAN-CHEN-VAO-AGENTS.md` trong bộ chạy.
- Các mẫu công việc và gói `vi-du` vẫn được giữ để tham khảo.

Xem các lệnh quản lý sổ:

```powershell
node E:/Workspaces/agent-virtual-office/tools/vp.js giup
```

Máy chủ đọc nhật ký Claude Code/Codex trên máy và sổ điều phối. Cài đặt hiện tại không có đường hầm Internet và không tự khởi động cùng Windows.
