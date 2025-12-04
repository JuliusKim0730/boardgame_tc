#!/bin/bash

echo "🚀 배포 시작..."

# 1. Git 상태 확인
echo "📋 Git 상태 확인..."
git status

# 2. 변경사항 커밋
echo "💾 변경사항 커밋..."
read -p "커밋 메시지를 입력하세요: " commit_message
git add .
git commit -m "$commit_message"

# 3. GitHub에 푸시
echo "📤 GitHub에 푸시..."
git push origin main

echo "✅ 배포 완료!"
echo ""
echo "📊 배포 상태 확인:"
echo "  - Render.com: https://dashboard.render.com/"
echo "  - Vercel: https://vercel.com/dashboard"
echo ""
echo "🔗 배포된 URL:"
echo "  - 프론트엔드: https://[your-project].vercel.app"
echo "  - 백엔드: https://boardgame-tc.onrender.com"
echo "  - Health Check: https://boardgame-tc.onrender.com/api/health"
