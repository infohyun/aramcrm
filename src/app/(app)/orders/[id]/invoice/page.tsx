"use client";

import { useState, useEffect, use } from "react";
import { FileText, Download, ArrowLeft, Loader2, Printer } from "lucide-react";
import Link from "next/link";

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  order: {
    orderNumber: string;
    orderDate: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    supplyPrice: number;
    tax: number;
    totalPrice: number;
    memo: string | null;
  };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
    addressDetail: string | null;
    zipCode: string | null;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

const formatKRW = (n: number) => n.toLocaleString("ko-KR");
const formatDate = (d: string) => {
  const date = new Date(d);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/orders/${id}/invoice`);
        if (res.ok) setInvoice(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  if (!invoice) {
    return <div className="text-center py-20 text-gray-500">주문을 찾을 수 없습니다</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar - hidden when printing */}
      <div className="no-print bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/customers" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              <Printer className="w-4 h-4" />
              인쇄 / PDF 저장
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">견적서 / 인보이스</h1>
              <p className="text-sm text-gray-500 mt-1">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-2">
                <FileText className="w-8 h-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-900">{invoice.company.name}</span>
              </div>
              {invoice.company.address && <p className="text-sm text-gray-500">{invoice.company.address}</p>}
              {invoice.company.phone && <p className="text-sm text-gray-500">{invoice.company.phone}</p>}
              {invoice.company.email && <p className="text-sm text-gray-500">{invoice.company.email}</p>}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">청구 대상</h3>
              <p className="text-sm font-semibold text-gray-900">{invoice.customer.name}</p>
              {invoice.customer.company && <p className="text-sm text-gray-600">{invoice.customer.company}</p>}
              {invoice.customer.address && <p className="text-sm text-gray-600">{invoice.customer.address} {invoice.customer.addressDetail || ""}</p>}
              {invoice.customer.phone && <p className="text-sm text-gray-600">{invoice.customer.phone}</p>}
              {invoice.customer.email && <p className="text-sm text-gray-600">{invoice.customer.email}</p>}
            </div>
            <div className="text-right">
              <div className="space-y-1">
                <div className="flex justify-end gap-4">
                  <span className="text-xs text-gray-500">발행일</span>
                  <span className="text-sm text-gray-900">{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-xs text-gray-500">주문일</span>
                  <span className="text-sm text-gray-900">{formatDate(invoice.order.orderDate)}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-xs text-gray-500">주문번호</span>
                  <span className="text-sm text-gray-900">{invoice.order.orderNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">품목</th>
                <th className="text-center py-3 text-xs font-semibold text-gray-500 uppercase">수량</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase">단가</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase">공급가</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 text-sm text-gray-900">{invoice.order.productName}</td>
                <td className="py-4 text-sm text-gray-900 text-center">{invoice.order.quantity}</td>
                <td className="py-4 text-sm text-gray-900 text-right">{formatKRW(invoice.order.unitPrice)}원</td>
                <td className="py-4 text-sm text-gray-900 text-right">{formatKRW(invoice.order.supplyPrice)}원</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-500">공급가액</span>
                <span className="text-gray-900">{formatKRW(invoice.order.supplyPrice)}원</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-500">부가세 (10%)</span>
                <span className="text-gray-900">{formatKRW(invoice.order.tax)}원</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-900 mt-2">
                <span className="text-base font-bold text-gray-900">합계</span>
                <span className="text-base font-bold text-indigo-600">{formatKRW(invoice.order.totalPrice)}원</span>
              </div>
            </div>
          </div>

          {/* Memo */}
          {invoice.order.memo && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">비고</h3>
              <p className="text-sm text-gray-600">{invoice.order.memo}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
            본 견적서는 {invoice.company.name}에서 발행하였습니다.
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  );
}
