$routes = @(
  "src/app/create/manual",
  "src/app/create/ai",
  "src/app/quiz/[id]/edit",
  "src/app/host/[roomCode]",
  "src/app/join/[roomCode]",
  "src/app/play/[roomCode]",
  "src/app/results/[roomCode]",
  "src/app/api/quiz",
  "src/app/api/ai"
)

foreach ($route in $routes) {
  New-Item -ItemType Directory -Force -Path $route
  $content = @"
export default function Page() {
  return <div>Placeholder for $($route)</div>
}
"@
  if ($route -like "*api*") {
    $content = @"
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
"@
    Set-Content -Path "$route/route.ts" -Value $content
  } else {
    Set-Content -Path "$route/page.tsx" -Value $content
  }
}
