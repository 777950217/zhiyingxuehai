"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "数据总览", href: "/admin" },
  { label: "客户管理", href: "/admin/clients" },
  { label: "兑换码管理", href: "/admin/redemption-codes" },
  { label: "财务记账", href: "/admin/cash-flow" },
];

export default function AdminTabsNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
