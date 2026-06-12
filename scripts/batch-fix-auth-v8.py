#!/usr/bin/env python3
"""
Batch fix API authentication - Add authenticateRequest() to all API endpoints
Strategy: Add basic auth check to all non-auth endpoints
"""

import os
import re
import sys

# Directories to scan
API_DIRS = [
    'src/app/(main)/api',
    'src/app/(aux)/api',
    'src/app/api'
]

# Endpoints that should remain public (no auth required)
PUBLIC_ENDPOINTS = [
    'auth/login',
    'auth/register',
    'auth/refresh',
    'auth/logout',
    'auth/reset-password',
    'auth/verify',
    'health',
    'public/',
    'webhook/',
]

def is_public_endpoint(file_path):
    """Check if this endpoint should be public"""
    for pattern in PUBLIC_ENDPOINTS:
        if pattern in file_path:
            return True
    return False

def has_authenticate_request(file_path):
    """Check if file already has authenticateRequest"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return 'authenticateRequest' in content

def add_auth_to_file(file_path):
    """Add authenticateRequest import and auth check to API file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if already has authenticateRequest
    if 'authenticateRequest' in content:
        return False
    
    # Skip if no exported handlers
    if 'export async function' not in content:
        return False
    
    # Add import after the last import line
    # Find all import lines
    import_pattern = r'^import\s+.*from\s+[\'"].*[\'"];?\s*$'
    lines = content.split('\n')
    
    # Find the last import line index
    last_import_idx = -1
    for i, line in enumerate(lines):
        if re.match(import_pattern, line.strip()):
            last_import_idx = i
    
    if last_import_idx == -1:
        print(f"  [WARN] No imports found in {file_path}")
        return False
    
    # Insert our import after last import
    import_line = "import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';"
    lines.insert(last_import_idx + 1, import_line)
    content = '\n'.join(lines)
    
    # Now add auth check to each handler function
    # Pattern: export async function GET(request: NextRequest) {
    # We need to add auth check right after the opening brace
    
    def add_auth_to_handler(match):
        func_decl = match.group(0)
        # Find the opening brace
        brace_idx = func_decl.find('{')
        if brace_idx == -1:
            return func_decl
        
        # Insert auth check after opening brace
        auth_check = """{
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  """
        return func_decl[:brace_idx] + auth_check
    
    # Apply to all handler functions
    handler_pattern = r'export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{'
    new_content = re.sub(handler_pattern, add_auth_to_handler, content)
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def main():
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    print("=" * 60)
    print("Batch API Authentication Fix Script")
    print("=" * 60)
    
    for api_dir in API_DIRS:
        if not os.path.exists(api_dir):
            print(f"[SKIP] Directory not found: {api_dir}")
            continue
        
        print(f"\nScanning: {api_dir}")
        
        # Find all route.ts files
        for root, dirs, files in os.walk(api_dir):
            for file in files:
                if file != 'route.ts':
                    continue
                
                file_path = os.path.join(root, file)
                
                # Skip public endpoints
                if is_public_endpoint(file_path):
                    skipped_count += 1
                    continue
                
                # Skip if already has auth
                if has_authenticate_request(file_path):
                    skipped_count += 1
                    continue
                
                # Try to add auth
                try:
                    if add_auth_to_file(file_path):
                        print(f"  [FIXED] {file_path}")
                        fixed_count += 1
                    else:
                        print(f"  [SKIP] {file_path} (no handlers or already fixed)")
                        skipped_count += 1
                except Exception as e:
                    print(f"  [ERROR] {file_path}: {e}")
                    error_count += 1
    
    print("\n" + "=" * 60)
    print(f"SUMMARY:")
    print(f"  Fixed: {fixed_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    print("=" * 60)

if __name__ == '__main__':
    main()
