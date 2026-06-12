"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Shield, Award } from "lucide-react";

interface CertificateData {
  code: string;
  userName: string;
  completedAt: string;
  issuedAt: string;
  issuedBy: string;
}

export default function CertificateVerifyPage() {
  const params = useParams();
  const code = params.code as string;
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<boolean | null>(null);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    fetch(`/api/certificate/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setValid(true);
          setCert(data.certificate);
        } else {
          setValid(false);
          setError(data.error || "证书编号无效");
        }
      })
      .catch(() => {
        setValid(false);
        setError("验证失败，请稍后重试");
      })
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-blue-800 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500 text-lg">正在验证证书...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <Shield className="w-14 h-14 text-blue-800 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">证书验真</h1>
        <p className="text-gray-500 mt-1">验证职盈学海结业证书真伪</p>
      </div>

      {valid && cert ? (
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-700">证书验证通过</h2>
            <p className="text-sm text-gray-500 mt-1">该证书编号真实有效</p>
          </div>

          <div className="space-y-4 text-lg">
            <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-4">
              <Award className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <div className="text-sm text-gray-500">持证人</div>
                <div className="font-bold text-gray-900">{cert.userName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
              <Shield className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <div className="text-sm text-gray-500">证书编号</div>
                <div className="font-mono font-bold text-gray-900">{cert.code}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500">完成日期</div>
                <div className="font-bold text-gray-900">
                  {new Date(cert.completedAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500">颁发机构</div>
                <div className="font-bold text-gray-900">{cert.issuedBy}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500">颁发日期</div>
              <div className="font-bold text-gray-900">
                {new Date(cert.issuedAt).toLocaleDateString("zh-CN")}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-red-200 rounded-2xl p-8 shadow-lg text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-700">证书验证失败</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <p className="text-sm text-gray-400 mt-4">
            如有疑问，请联系职盈学海官方客服
          </p>
        </div>
      )}
    </div>
  );
}
