// src/ui/index.ts
import { UI_STYLES } from './styles';
import { UI_MARKUP } from './markup';
import { UI_SCRIPT } from './script';

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SubConverter Pro | 全能訂閱轉換器</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  
  <style>
${UI_STYLES}
  </style>
</head>
<body>
${UI_MARKUP}
  <script>
${UI_SCRIPT}
  </script>
</body>
</html>
`;
