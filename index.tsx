<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>맞춤 단어 사전</title>
    <meta name="description" content="AI 기반 학생 맞춤형 단어 사전" />
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Noto Sans KR', sans-serif;
      }
      /* Custom Animation for Result Card */
      @keyframes cardEntrance {
        0% {
          opacity: 0;
          transform: scale(0.92) translateY(30px);
          filter: blur(10px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
          filter: blur(0);
        }
      }
      .animate-card-entrance {
        animation: cardEntrance 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        will-change: transform, opacity, filter;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>