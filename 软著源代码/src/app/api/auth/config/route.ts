import { NextResponse } from 'next/server';

export async function GET() {
  // 临时硬编码：Coze部署环境变量指向火山引擎实例，但用户数据在官方Supabase
  // TODO: Coze平台支持修改环境变量后改回getSupabaseCredentials()
  return NextResponse.json({
    supabaseUrl: 'https://ojolpkzgeivgbokotaap.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDUzNzYsImV4cCI6MjA5Mzg4MTM3Nn0.NY95byVizD3UgaZktmiJ3qx0VYuzt59GLOBQXIm5OdA',
  });
}
