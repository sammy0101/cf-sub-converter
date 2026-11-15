// src/ui/styles.ts
export const UI_STYLES = `
    :root {
      --bg-app: #0f172a;
      --bg-panel: #1e293b;
      --bg-input: #0f172a;
      --bg-hover: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-app); color: var(--text-main); line-height: 1.5; min-height: 100vh;
    }
    svg { width: 1.25rem; height: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .header {
      background-color: var(--bg-panel); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.25rem; }
    .brand svg { color: var(--primary); width: 1.75rem; height: 1.75rem; }
    .badge { background: rgba(59, 130, 246, 0.1); color: var(--primary); font-size: 0.75rem; padding: 4px 8px; border-radius: 9999px; font-weight: 600; border: 1px solid rgba(59, 130, 246, 0.2); }
    .container { max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .panel { background-color: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .panel-title { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group:last-child { margin-bottom: 0; }
    label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); margin-bottom: 0.5rem; }
    textarea, input[type="text"], input[type="password"] {
      width: 100%; background-color: var(--bg-input); border: 1px solid var(--border); color: var(--text-main); border-radius: var(--radius-md); padding: 0.875rem 1rem; font-size: 0.95rem; outline: none; transition: border-color 0.2s;
    }
    textarea { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; min-height: 140px; resize: vertical; }
    textarea:focus, input[type="text"]:focus, input[type="password"]:focus { border-color: var(--primary); }
    .hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem; display: flex; align-items: flex-start; gap: 6px; }
    
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.95rem; border: none; cursor: pointer; transition: all 0.2s; user-select: none;
    }
    .btn-primary { background-color: var(--primary); color: white; width: 100%; padding: 1rem; font-size: 1.05rem; }
    .btn-primary:hover { background-color: var(--primary-hover); }
    .btn-icon { background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border); padding: 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
    .btn-icon:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--text-muted); }
    .btn-ghost { background: transparent; color: var(--text-muted); padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem;}
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-main); }
    .btn-danger:hover { color: var(--danger); border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }

    .results-wrapper { display: none; }
    .results-wrapper.show { display: block; animation: slideUp 0.3s ease forwards; }
    .result-item { display: flex; align-items: center; gap: 1rem; background-color: var(--bg-input); border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; }
    .result-icon-box { width: 44px; height: 44px; border-radius: var(--radius-sm); background-color: var(--bg-panel); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
    .result-info { flex: 1; min-width: 140px; }
    .result-name { font-weight: 600; font-size: 0.95rem; color: var(--text-main); }
    .result-desc { font-size: 0.8rem; color: var(--text-muted); }
    .result-input-wrapper { flex: 2; position: relative; }
    .result-input-wrapper input { width: 100%; padding: 0.6rem 0.8rem; background: var(--bg-panel); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-muted); }
    .result-actions { display: flex; gap: 6px; flex-shrink: 0; }

    .fav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .fav-card { 
      background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; cursor: pointer; transition: all 0.2s ease; 
    }
    .fav-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .fav-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .fav-url { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fav-actions { display: flex; gap: 8px; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); justify-content: flex-end; }
    .empty-state { text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.9rem; border: 1px dashed var(--border); border-radius: var(--radius-md); }

    .lock-card {
      background: radial-gradient(circle at top, rgba(59, 130, 246, 0.08) 0%, rgba(15, 23, 42, 0.5) 100%);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: var(--radius-md);
      padding: 1.75rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 340px;
      width: 100%;
      margin: 0.75rem auto;
      box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);
    }
    .lock-icon-badge {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.05));
      border: 1px solid rgba(59, 130, 246, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      color: var(--primary);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.2);
    }
    .lock-icon-badge svg { width: 22px; height: 22px; }
    .lock-title { font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem; }
    .lock-desc { font-size: 0.8rem; color: var(--text-muted); max-width: 280px; line-height: 1.4; margin-bottom: 1.25rem; }
    .lock-form { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; }
    .lock-form input {
      width: 100% !important; text-align: center; letter-spacing: 2px; font-size: 0.95rem; padding: 0.7rem 1rem;
      background: var(--bg-app); border: 1px solid var(--border); border-radius: var(--radius-sm);
    }
    .lock-form .btn { width: 100% !important; padding: 0.7rem; font-size: 0.92rem; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

    /* 操作日誌樣式 */
    .logs-table-wrap {
      width: 100%; overflow-x: auto; background: var(--bg-input);
      border: 1px solid var(--border); border-radius: var(--radius-md);
    }
    .logs-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; }
    .logs-table th {
      color: var(--text-muted); font-weight: 600; padding: 0.75rem 0.875rem;
      border-bottom: 1px solid var(--border); background: rgba(30, 41, 59, 0.45); white-space: nowrap;
    }
    .logs-table td {
      padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(51, 65, 85, 0.55);
      color: var(--text-main); vertical-align: middle;
    }
    .logs-table tr:last-child td { border-bottom: none; }
    .logs-table tr:hover td { background: rgba(51, 65, 85, 0.25); }
    .logs-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: #cbd5e1; }
    .logs-url-cell { max-width: 260px; word-break: break-all; font-family: 'JetBrains Mono', monospace; font-size: 0.76rem; color: #cbd5e1; }
    .logs-ua-cell { max-width: 220px; word-break: break-word; font-size: 0.76rem; color: var(--text-muted); }
    .log-badge {
      display: inline-block; padding: 2px 9px; border-radius: var(--radius-sm);
      font-size: 0.75rem; font-weight: 600; white-space: nowrap; color: #ffffff;
    }
    .log-badge-sub { background-color: var(--success); }
    .log-badge-login { background-color: var(--warning); }
    .log-badge-fail { background-color: var(--danger); }
    .log-badge-edit { background-color: var(--primary); }

    .logs-footer {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; margin-top: 1.25rem; flex-wrap: wrap;
    }
    .logs-note { font-size: 0.8rem; color: var(--text-muted); }
    .logs-modal-content { max-width: 1080px !important; width: 95% !important; padding: 1.75rem !important; }
    .logs-modal-scroll {
      max-height: 62vh; overflow: auto; border: 1px solid var(--border);
      border-radius: var(--radius-md); background: var(--bg-input);
    }

    /* TG 消息通知設定樣式 */
    .tg-control-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; flex-wrap: wrap; background: var(--bg-input);
      border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
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
      background: var(--bg-input); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 1.15rem 1.25rem;
      font-size: 0.88rem; color: var(--text-main); line-height: 1.65;
    }
    .tg-help-step { margin-bottom: 1rem; }
    .tg-help-step:last-child { margin-bottom: 0; }
    .tg-help-step-title { font-weight: 600; color: var(--primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .tg-help-box code {
      background: var(--bg-panel); border: 1px solid var(--border);
      padding: 1px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem; color: #93c5fd;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .shake { animation: shake 0.4s ease-in-out; border-color: var(--danger) !important; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); z-index: 100; display: none; align-items: center; justify-content: center; }
    .modal-overlay.show { display: flex; }
    .modal-content { background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 92%; max-width: 720px; padding: 2rem; max-height: 92vh; overflow-y: auto; }
    .modal-footer { display: flex; gap: 12px; margin-top: 2rem; justify-content: flex-end; }

    .toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: var(--bg-panel); color: var(--text-main); border: 1px solid var(--border); padding: 0.8rem 1.5rem; border-radius: 999px; font-weight: 500; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity 0.3s; z-index: 200; pointer-events: none; }
    .toast.show { opacity: 1; }
    .toast.success svg { color: var(--success); }
    .toast.error svg { color: var(--danger); }
    .cmd-group { display: flex; gap: 8px; margin-top: 8px; align-items: center; width: 100%; }
    .cmd-group input { flex: 1; }
    .cmd-group .btn { flex-shrink: 0; }

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
`;
