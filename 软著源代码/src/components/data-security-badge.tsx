export function DataSecurityBadge({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
      dark
        ? 'bg-blue-950/50 border border-blue-800/50 text-blue-300'
        : 'bg-blue-50 border border-blue-200 text-blue-800'
    }`}>
      <span>🔒</span>
      <span className="font-medium">数据安全：加密存�?+ 定期备份 + 仅你可见</span>
    </div>
  );
}
