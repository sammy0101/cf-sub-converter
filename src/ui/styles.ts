// src/ui/styles.ts
export const UI_STYLES = `
    :root {
      --bg-app: #040711;
      --bg-panel: rgba(255, 255, 255, 0.06);
      --bg-input: rgba(6, 10, 24, 0.68);
      --bg-hover: rgba(255, 255, 255, 0.13);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.14);
      --border-specular: rgba(255, 255, 255, 0.24);
      --primary: #3b82f6;
      --primary-hover: #60a5fa;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --radius-sm: 10px;
      --radius-md: 14px;
      --radius-lg: 22px;
      --shadow: 0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.22), inset 1px 0 0 rgba(255, 255, 255, 0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { background-color: var(--bg-app); }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(ellipse at 50% 0%, #0d1633 0%, #040711 70%);
      color: var(--text-main);
      line-height: 1.5;
      min-height: 100vh;
      position: relative;
      z-index: 0;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* 背景流動極光光斑 (GPU 合成層渲染，不影響文字點擊與排版) */
    body::before,
    body::after {
      content: "";
      position: fixed;
      border-radius: 50%;
      filter: blur(95px);
      pointer-events: none;
      z-index: -1;
      will-change: transform;
    }
    body::before {
      width: 540px;
      height: 540px;
      top: -150px;
      left: -130px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.36) 0%, rgba(139, 92, 246, 0.22) 55%, transparent 75%);
      animation: liquidDriftA 18s ease-in-out infinite alternate;
    }
    body::after {
      width: 580px;
      height: 580px;
      bottom: -170px;
      right: -130px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.28) 0%, rgba(59, 130, 246, 0.2) 55%, transparent 75%);
      animation: liquidDriftB 22s ease-in-out infinite alternate;
    }

    @keyframes liquidDriftA {
      0% { transform: translate3d(0, 0, 0) scale(1); }
      100% { transform: translate3d(90px, 60px, 0) scale(1.12); }
    }
    @keyframes liquidDriftB {
      0% { transform: translate3d(0, 0, 0) scale(1); }
      100% { transform: translate3d(-80px, -70px, 0) scale(1.1); }
    }

    svg { width: 1.25rem; height: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    .header {
      background: rgba(10, 15, 32, 0.56);
      backdrop-filter: blur(28px) saturate(190%);
      -webkit-backdrop-filter: blur(28px) saturate(190%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.32), inset 0 -1px 0 rgba(255, 255, 255, 0.05);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.25rem; letter-spacing: -0.01em; }
    .brand svg { color: #60a5fa; width: 1.75rem; height: 1.75rem; filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.45)); }
    .badge {
      background: rgba(59, 130, 246, 0.18);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #93c5fd;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 600;
      border: 1px solid rgba(96, 165, 250, 0.3);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .container { max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

    .panel {
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.085) 0%, rgba(255, 255, 255, 0.025) 100%);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      box-shadow: var(--shadow);
    }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .panel-title { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35); }
    .form-group { margin-bottom: 1.25rem; }
    .form-group:last-child { margin-bottom: 0; }
    label { display: block; font-size: 0.875rem; font-weight: 500; color: #cbd5e1; margin-bottom: 0.5rem; }

    /* 輸入框：高對比深色玻璃保護 */
    textarea, input[type="text"], input[type="password"] {
      width: 100%;
      background-color: var(--bg-input);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--text-main);
      border-radius: var(--radius-md);
      padding: 0.875rem 1rem;
      font-size: 0.95rem;
      outline: none;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.38);
      transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
    }
    textarea { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; min-height: 140px; resize: vertical; }
    textarea:focus, input[type="text"]:focus, input[type="password"]:focus {
      border-color: rgba(96, 165, 250, 0.78);
      background-color: rgba(8, 13, 30, 0.85);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22), inset 0 2px 6px rgba(0, 0, 0, 0.38);
    }
    .hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.45rem; display: flex; align-items: flex-start; gap: 6px; }

    /* Liquid Pill / Specular 按鈕 */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 0.75rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.95rem;
      border: none; cursor: pointer; user-select: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .btn:active { transform: scale(0.975); }
    .btn-primary {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.92), rgba(37, 99, 235, 0.88));
      color: white;
      width: 100%;
      padding: 1rem;
      font-size: 1.05rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.96), rgba(59, 130, 246, 0.92));
      transform: translateY(-1px);
      box-shadow: 0 12px 30px rgba(59, 130, 246, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.45);
    }
    .btn-icon {
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: var(--text-main);
      border: 1px solid rgba(255, 255, 255, 0.14);
      padding: 0.6rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
      transition: transform 0.2s, background 0.2s, color 0.2s, border-color 0.2s;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #93c5fd;
      border-color: rgba(255, 255, 255, 0.28);
      transform: translateY(-1px);
    }
    .btn-ghost {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #cbd5e1;
      padding: 0.5rem 0.8rem;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
    }
    .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.13);
      color: var(--text-main);
      border-color: rgba(255, 255, 255, 0.26);
      transform: translateY(-1px);
    }
    .btn-danger:hover {
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.45);
      background: rgba(239, 68, 68, 0.18);
    }

    .results-wrapper { display: none; }
    .results-wrapper.show { display: block; animation: slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .result-item {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(9, 14, 32, 0.58);
      border: 1px solid rgba(255, 255, 255, 0.11);
      padding: 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: border-color 0.2s, background 0.2s;
    }
    .result-item:hover {
      border-color: rgba(255, 255, 255, 0.22);
      background: rgba(14, 21, 46, 0.66);
    }
    .result-icon-box {
      width: 44px; height: 44px; border-radius: var(--radius-sm);
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(96, 165, 250, 0.25);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
      display: flex; align-items: center; justify-content: center; color: #60a5fa; flex-shrink: 0;
    }
    .result-info { flex: 1; min-width: 140px; }
    .result-name { font-weight: 600; font-size: 0.95rem; color: var(--text-main); }
    .result-desc { font-size: 0.8rem; color: var(--text-muted); }
    .result-input-wrapper { flex: 2; position: relative; }
    .result-input-wrapper input {
      width: 100%; padding: 0.6rem 0.8rem;
      background: rgba(4, 7, 18, 0.72);
      font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius-sm); color: #cbd5e1;
    }
    .result-actions { display: flex; gap: 6px; flex-shrink: 0; }

    .fav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .fav-card {
      background: rgba(9, 14, 32, 0.58);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.14);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, background 0.2s, box-shadow 0.2s;
    }
    .fav-card:hover {
      border-color: rgba(96, 165, 250, 0.55);
      background: rgba(16, 25, 54, 0.7);
      transform: translateY(-3px);
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.26);
    }
    .fav-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .fav-url { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fav-actions { display: flex; gap: 8px; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); justify-content: flex-end; }
    .empty-state {
      text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.9rem;
      border: 1px dashed rgba(255, 255, 255, 0.16); border-radius: var(--radius-md);
      background: rgba(6, 10, 24, 0.42);
    }

    .lock-card {
      background: linear-gradient(150deg, rgba(59, 130, 246, 0.12) 0%, rgba(10, 16, 36, 0.68) 100%);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border: 1px solid rgba(96, 165, 250, 0.3);
      border-radius: var(--radius-lg);
      padding: 1.75rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 340px;
      width: 100%;
      margin: 0.75rem auto;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.22);
    }
    .lock-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.28), rgba(37, 99, 235, 0.08));
      border: 1px solid rgba(96, 165, 250, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      color: #93c5fd;
      box-shadow: 0 0 22px rgba(59, 130, 246, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
    .lock-icon-badge svg { width: 22px; height: 22px; }
    .lock-title { font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem; }
    .lock-desc { font-size: 0.8rem; color: var(--text-muted); max-width: 280px; line-height: 1.4; margin-bottom: 1.25rem; }
    .lock-form { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; }
    .lock-form input {
      width: 100% !important; text-align: center; letter-spacing: 2px; font-size: 0.95rem; padding: 0.7rem 1rem;
      background: rgba(4, 7, 18, 0.78); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: var(--radius-sm);
    }
    .lock-form .btn { width: 100% !important; padding: 0.75rem; font-size: 0.92rem; font-weight: 600; }

    /* 操作日誌樣式：高對比玻璃容器 */
    .logs-table-wrap {
      width: 100%; overflow-x: auto;
      background: rgba(6, 10, 24, 0.74);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.35);
    }
    .logs-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; }
    .logs-table th {
      color: #cbd5e1; font-weight: 600; padding: 0.75rem 0.875rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(15, 23, 42, 0.78); white-space: nowrap;
    }
    .logs-table td {
      padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      color: var(--text-main); vertical-align: middle;
    }
    .logs-table tr:last-child td { border-bottom: none; }
    .logs-table tr:hover td { background: rgba(255, 255, 255, 0.05); }
    .logs-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: #e2e8f0; }
    .logs-url-cell { max-width: 260px; word-break: break-all; font-family: 'JetBrains Mono', monospace; font-size: 0.76rem; color: #cbd5e1; }
    .logs-ua-cell { max-width: 220px; word-break: break-word; font-size: 0.76rem; color: var(--text-muted); }
    .log-badge {
      display: inline-block; padding: 2px 10px; border-radius: 9999px;
      font-size: 0.75rem; font-weight: 600; white-space: nowrap; color: #ffffff;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .log-badge-sub { background: rgba(16, 185, 129, 0.88); }
    .log-badge-login { background: rgba(245, 158, 11, 0.9); }
    .log-badge-fail { background: rgba(239, 68, 68, 0.9); }
    .log-badge-edit { background: rgba(59, 130, 246, 0.9); }

    .logs-footer {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; margin-top: 1.25rem; flex-wrap: wrap;
    }
    .logs-note { font-size: 0.8rem; color: var(--text-muted); }
    .logs-modal-content { max-width: 1080px !important; width: 95% !important; padding: 1.75rem !important; }
    .logs-modal-scroll {
      max-height: 62vh; overflow: auto;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      background: rgba(6, 10, 24, 0.76);
    }

    /* TG 消息通知設定樣式 */
    .tg-control-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; flex-wrap: wrap;
      background: rgba(9, 14, 32, 0.58);
      border: 1px solid rgba(255, 255, 255, 0.11);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }
    .tg-left-group { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .tg-label-text { font-weight: 600; font-size: 0.95rem; color: var(--text-main); }
    .tg-checkbox-label {
      display: inline-flex !important; align-items: center; gap: 6px;
      margin-bottom: 0 !important; cursor: pointer; font-size: 0.9rem;
      color: var(--text-main); user-select: none;
    }
    .tg-checkbox-label input[type="checkbox"] {
      width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;
    }
    .tg-actions-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .tg-help-box {
      background: rgba(6, 10, 24, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md); padding: 1.2rem 1.35rem;
      font-size: 0.88rem; color: var(--text-main); line-height: 1.7;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .tg-help-step { margin-bottom: 1rem; }
    .tg-help-step:last-child { margin-bottom: 0; }
    .tg-help-step-title { font-weight: 600; color: #60a5fa; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .tg-help-box code {
      background: rgba(59, 130, 246, 0.16);
      border: 1px solid rgba(96, 165, 250, 0.25);
      padding: 1px 6px; border-radius: 6px; font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem; color: #93c5fd;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .shake { animation: shake 0.4s ease-in-out; border-color: var(--danger) !important; }

    /* 彈窗液態玻璃遮罩與浮層 */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(3, 6, 16, 0.62);
      backdrop-filter: blur(14px) saturate(140%);
      -webkit-backdrop-filter: blur(14px) saturate(140%);
      z-index: 100; display: none; align-items: center; justify-content: center;
    }
    .modal-overlay.show { display: flex; }
    .modal-content {
      background: linear-gradient(155deg, rgba(22, 33, 62, 0.84) 0%, rgba(10, 16, 34, 0.9) 100%);
      backdrop-filter: blur(32px) saturate(190%);
      -webkit-backdrop-filter: blur(32px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 24px;
      width: 92%; max-width: 720px; padding: 2rem; max-height: 92vh; overflow-y: auto;
      box-shadow: 0 28px 64px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.28);
    }
    .modal-footer { display: flex; gap: 12px; margin-top: 2rem; justify-content: flex-end; }

    .toast {
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      background: rgba(12, 18, 38, 0.84);
      backdrop-filter: blur(22px) saturate(180%);
      -webkit-backdrop-filter: blur(22px) saturate(180%);
      color: var(--text-main);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.8rem 1.5rem; border-radius: 999px; font-weight: 500; font-size: 0.9rem;
      display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity 0.3s; z-index: 200; pointer-events: none;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.22);
    }
    .toast.show { opacity: 1; }
    .toast.success svg { color: var(--success); }
    .toast.error svg { color: var(--danger); }
    .cmd-group { display: flex; gap: 8px; margin-top: 8px; align-items: center; width: 100%; }
    .cmd-group input { flex: 1; }
    .cmd-group .btn { flex-shrink: 0; }

    /* 美化玻璃捲軸 */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 999px; }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.32); }

    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 640px) {
      .result-item { flex-direction: column; align-items: stretch; gap: 8px; padding: 1rem; }
      .result-icon-box { display: none; }
      .result-actions { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
      .result-actions .btn-icon { height: 38px; display: flex; justify-content: center; align-items: center; }
      .lock-card { padding: 1.5rem 1rem; }
      .logs-footer { flex-direction: column; align-items: stretch; }
      .tg-control-row { flex-direction: column; align-items: stretch; }
      .tg-actions-group { justify-content: flex-end; }
    }

    /* 無障礙動效降級保護 (降低系統動態效果 / 省電模式時自動停用動畫) */
    @media (prefers-reduced-motion: reduce) {
      body::before, body::after { animation: none !important; }
      .results-wrapper.show, .shake { animation: none !important; }
      .btn, .btn-icon, .fav-card, .result-item, textarea, input { transition: none !important; }
    }

    /* 不支援 backdrop-filter 之舊瀏覽器容災保底 */
    @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      .header, .panel, .modal-content, .toast, .lock-card {
        background: rgba(15, 23, 42, 0.94);
      }
    }
`;
