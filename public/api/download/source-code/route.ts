import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';

export async function GET() {
  const file = await readFile('/workspace/projects/软著材料/源代码.pdf');
  return new NextResponse(file, {
    headers: { 
      'Content-Type': 'application/pdf', 
      'Content-Disposition': 'attachment; filename="source-code.pdf"' 
    }
  });
}
