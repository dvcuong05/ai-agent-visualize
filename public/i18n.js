(() => {
  const translations = {
    "Văn phòng AI": "AI Office", "Công ty AI · trực tiếp": "AI Company · Live",
    "TRỰC TIẾP": "LIVE", "Đang làm": "Working", "Chờ/chặn": "Waiting/Blocked",
    "Đang chờ": "Waiting", "Bị chặn": "Blocked", "Rảnh / nghỉ": "Idle / Away",
    "Việc ưu tiên": "Priority Tasks", "Cần anh": "Needs Your Attention",
    "Tiền AI hôm nay": "AI Cost Today", "Mở bảng điều hành để xem ai đang chờ bạn": "Open the dashboard to see who is waiting for you",
    "Tiền AI hôm nay (ước tính) so với trần": "Estimated AI cost today vs. budget",
    "Màn hình tường trái": "Left wall display", "Màn hình lớn giữa phòng": "Main display",
    "Màn hình tường phải": "Right wall display", "Công việc": "Tasks",
    "Xem màn hình lớn": "Open Dashboard", "Nội quy": "Rules", "Nội quy ◨": "Rules ◨",
    "Về văn phòng 3D": "Back to 3D Office", "Văn phòng 3D": "3D Office",
    "Kéo để xoay · chụm/cuộn để phóng to · bấm vào tên một người để xem họ đang làm gì": "Drag to rotate · pinch/scroll to zoom · select a person to see what they are doing",
    "Tổng quan": "Overview", "Hòm thư": "Inbox", "Đánh giá nhân sự": "Team Performance",
    "Mở bảng điều hành toàn màn hình": "Open Full-screen Dashboard", "Sơ đồ 2D": "2D Map",
    "Bảng điều hành": "Dashboard", "Công việc & tiến độ": "Tasks & Progress",
    "Nội quy & đội ngũ": "Rules & Team", "Tin nhắn": "Messages",
    "Bảng nhân sự trực tiếp": "Live Team", "Người": "Person", "Trạng thái": "Status",
    "Đang làm gì (câu mới nhất)": "Current Activity (Latest Update)", "Lần cuối": "Last Seen",
    "60 phút qua": "Last 60 Minutes", "Phòng DEV": "DEV Room", "Lịch DEV hôm nay": "Today's DEV Schedule",
    "ai giữ lượt, lúc nào": "who has the turn and when", "Hàng chờ lên DEV": "DEV Queue",
    "Luồng tin giữa các phòng": "Messages Between Rooms", "Tin mới nhất": "Latest Messages",
    "Nhịp làm việc 3 giờ qua": "Activity Over the Last 3 Hours", "số phiên có hoạt động mỗi phút": "active sessions per minute",
    "Đang chờ": "Waiting", "Rảnh": "Idle", "Nghỉ": "Away", "Trống": "Available",
    "đang làm": "working", "đang giữ": "holding", "đạt": "completed", "lượt": "turns",
    "phiên": "sessions", "tin hôm nay": "messages today", "đang chạy": "running",
    "hôm nay": "today", "tháng": "month", "tuần": "week", "ngày": "day",
    "Không có": "None", "Không có việc ưu tiên": "No priority tasks",
    "Không có tin nhắn": "No messages", "Không có phiên": "No sessions",
    "Không kết nối được máy chủ văn phòng.": "Could not connect to the office server.",
    "Gửi không được.": "Message could not be sent.", "Đang tải…": "Loading…",
    "Quay lại": "Back", "Làm mới": "Refresh", "Tìm kiếm": "Search",
    "Gửi": "Send", "Lưu": "Save", "Đóng": "Close", "Xong": "Done",
    "Mã PIN": "PIN", "Nhập khóa xem văn phòng": "Enter the office access key", "Vào xem": "Open Office",
    "Phòng Giám đốc": "Director's Office", "Phòng Quản lý": "Management Office",
    "Phòng Điều phối": "Coordination Office", "Kiểm tra & duyệt": "Review & QA",
    "Studio Claude": "Claude Studio", "Phòng DEV": "DEV Room", "Khu kỹ sư Codex": "Codex Engineering",
    "Phòng họp": "Meeting Room", "Phòng họp · trống": "Meeting Room · Available",
    "Khu Codex": "Codex Area", "Giám đốc": "Director", "Quản lý": "Manager",
    "Điều phối": "Coordinator", "Kỹ sư Codex": "Codex Engineer", "Kỹ sư Claude Code": "Claude Code Engineer"
  };
  const dictionary = Object.entries(translations);
  const custom = [];
  const pairs = (s) => s ? [[s.vi, s.en]] : [];
  fetch("state", { cache: "no-store" }).then((r) => r.json()).then((s) => {
    const l = s.localization || {};
    custom.push(...pairs(l.title), ...pairs(l.subtitle), ...pairs(l.ownerName), ...Object.values(l.rooms || {}).flatMap(pairs), ...(l.staff || []).flatMap(pairs));
    custom.sort((a,b) => b[0].length - a[0].length);
    update();
  }).catch(() => {});
  const storageKey = "van-phong-ao-language";
  let language = localStorage.getItem(storageKey) === "en" ? "en" : "vi";
  const translate = (text) => {
    if (language !== "en") return text;
    let result = text;
    for (const [vi, en] of [...custom, ...dictionary]) result = result.split(vi).join(en);
    return result;
  };
  const update = (root = document.body) => {
    if (language === "en") {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.parentElement?.closest("script,style,textarea,[contenteditable=true],#language-toggle")) continue;
        const original = node.__officeVi ?? node.nodeValue;
        if ([...custom, ...dictionary].some(([vi]) => original.includes(vi))) {
          node.__officeVi = original;
          node.nodeValue = translate(original);
        }
      }
      root.querySelectorAll?.("[title],[placeholder],[aria-label]").forEach((el) => {
        for (const attr of ["title", "placeholder", "aria-label"]) {
          if (el.hasAttribute(attr)) {
            const key = `__office_${attr.replace('-', '_')}`;
            el.dataset[key] ??= el.getAttribute(attr);
            el.setAttribute(attr, translate(el.dataset[key]));
          }
        }
      });
    } else {
      document.querySelectorAll("body *").forEach((el) => {
        for (const attr of ["title", "placeholder", "aria-label"]) {
          const key = `__office_${attr.replace('-', '_')}`;
          if (el.dataset[key] !== undefined) el.setAttribute(attr, el.dataset[key]);
        }
      });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) if (node.__officeVi !== undefined) node.nodeValue = node.__officeVi;
    }
    document.documentElement.lang = language;
    const button = document.getElementById("language-toggle");
    if (button) { button.textContent = language === "vi" ? "🇬🇧 EN" : "🇻🇳 VI"; button.title = language === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"; }
  };
  const button = document.createElement("button");
  button.id = "language-toggle";
  button.type = "button";
  button.setAttribute("aria-label", "Change language");
  button.style.cssText = "position:fixed;z-index:2147483000;top:68px;right:16px;min-width:88px;padding:9px 13px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid #777;border-radius:999px;background:#171717;color:#fff;font:700 14px system-ui;cursor:pointer;box-shadow:0 2px 12px #0009";
  button.addEventListener("click", () => { language = language === "vi" ? "en" : "vi"; localStorage.setItem(storageKey, language); update(); });
  document.addEventListener("DOMContentLoaded", () => { document.body.appendChild(button); update(); });
  new MutationObserver((records) => {
    if (language !== "en") return;
    for (const r of records) for (const n of r.addedNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) update(n);
      else if (n.nodeType === Node.TEXT_NODE && n.parentElement?.id !== "language-toggle") {
        const original = n.__officeVi ?? n.nodeValue;
        if ([...custom, ...dictionary].some(([vi]) => original.includes(vi))) { n.__officeVi = original; n.nodeValue = translate(original); }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
