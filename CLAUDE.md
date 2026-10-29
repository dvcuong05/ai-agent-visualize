# Dành cho agent AI

Nếu chủ của bạn gửi link kho này để cài văn phòng ảo: đọc và làm theo **HUONG-DAN-CHO-AGENT.md** (cài, kiểm, điền sổ, báo lại chủ).
Nếu bạn được giao sửa mã văn phòng: máy chủ `server.js` + `lib/` chỉ đọc nhật ký phiên và sổ `data/`; công cụ ghi sổ là `tools/vp.js`; giao diện ở `public/`. Không thêm thư viện ngoài, không gửi dữ liệu ra ngoài.

<!-- Đoạn này dán vào cuối AGENTS.md (Codex) và CLAUDE.md (Claude Code) của DỰ ÁN, để mọi phiên AI làm theo cùng một cách và văn phòng ảo hiện đúng. -->
## Văn phòng ảo và sổ điều phối của đội

Đội làm việc trong một văn phòng ảo; chủ văn phòng xem ở http://localhost:7788. Mọi sổ của đội nằm ở `E:/Workspaces/agent-virtual-office/data` và chỉ ghi bằng công cụ:

```
node "E:/Workspaces/agent-virtual-office/tools/vp.js" <lệnh>        (xem đủ lệnh: node "E:/Workspaces/agent-virtual-office/tools/vp.js" giup)
```

- **Đọc trước khi làm:** nội quy `E:/Workspaces/agent-virtual-office/data/NOI-QUY.md`, đội ngũ `E:/Workspaces/agent-virtual-office/data/DOI-NGU.md`, việc ưu tiên `node "E:/Workspaces/agent-virtual-office/tools/vp.js" viec ds`.
- **Tên phiên = tên vai** trong DOI-NGU.md (Claude Code: `/rename <vai>`; Codex: đặt tên thread). Văn phòng và hòm thư nhận người theo tên này.
- **Cuối mỗi lượt:** `node "E:/Workspaces/agent-virtual-office/tools/vp.js" tiep --toi "<vai của mình>"`. Còn tin thì làm, xong chạy `node "E:/Workspaces/agent-virtual-office/tools/vp.js" xong <mã> --ghi-chu "<kết quả 1 dòng>"` rồi `tiep` lại; hết tin mới dừng. Tin trùng hay hết hiệu lực cũng đóng bằng `xong`.
- **Giao việc cho người khác:** `node "E:/Workspaces/agent-virtual-office/tools/vp.js" gui --toi "<vai>" --tu "<vai mình>" "[VIỆC] …"`. Không gửi tin chỉ để báo.
- **Cần chủ văn phòng quyết** (production, tiền, khóa mới, xóa dữ liệu, đổi luật): `node "E:/Workspaces/agent-virtual-office/tools/vp.js" cananh hoi --tu "<vai mình>" "…" --lua-chon "a / b"`. Việc khác trong quyền thì tự quyết.
- **Lên DEV:** `node "E:/Workspaces/agent-virtual-office/tools/vp.js" luot cho|lay|nha …`. Mỗi lúc một người giữ lượt, xong phải nhả kèm kết quả (`--ket-qua dat|hong`, có tiền AI thì `--usd`).
- **Gói việc và tiến độ:** `node "E:/Workspaces/agent-virtual-office/tools/vp.js" goi dat|sua|ghichu …`, `node "E:/Workspaces/agent-virtual-office/tools/vp.js" tiendo <gói> "…"`. Trước khi nghỉ hoặc bị nén ngữ cảnh: `node "E:/Workspaces/agent-virtual-office/tools/vp.js" tiendo <gói> "…" --dang-do --vai "<vai>"`.
- **Bị chặn:** ghi `[CHẶN]` ở câu trả lời (văn phòng tô đỏ) và giao người gỡ được.
- **Bài học:** lỗi mới mất ≥ 20 phút thì `node "E:/Workspaces/agent-virtual-office/tools/vp.js" baihoc --the "<thẻ>" "…" --chan "cái chặn tự động"`.


Mỗi khi thay đổi tính năng, cập nhật hoặc bổ sung tài liệu liên quan; ưu tiên cấu trúc docs hiện có và viết bằng tiếng Việt.
