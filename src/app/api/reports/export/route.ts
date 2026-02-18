import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/export - CSV 내보내기
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "sales";

    let csvContent = "";
    const BOM = "\uFEFF"; // UTF-8 BOM for Korean characters in Excel

    switch (type) {
      case "sales": {
        const orders = await prisma.order.findMany({
          include: {
            customer: {
              select: {
                name: true,
                company: true,
                grade: true,
              },
            },
          },
          orderBy: { orderDate: "desc" },
        });

        csvContent = "주문번호,고객명,회사명,고객등급,제품명,수량,단가,총액,상태,주문일\n";
        for (const order of orders) {
          const statusLabel = getOrderStatusLabel(order.status);
          csvContent += `"${order.orderNumber}","${order.customer?.name || ""}","${order.customer?.company || ""}","${getGradeLabel(order.customer?.grade || "")}","${order.productName}",${order.quantity},${order.unitPrice},${order.totalPrice},"${statusLabel}","${formatDate(order.orderDate)}"\n`;
        }
        break;
      }

      case "service": {
        const tickets = await prisma.serviceTicket.findMany({
          include: {
            customer: {
              select: {
                name: true,
                company: true,
              },
            },
            assignedTo: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        csvContent = "접수번호,고객명,회사명,카테고리,우선순위,제목,상태,담당자,접수일,소요일수\n";
        for (const ticket of tickets) {
          csvContent += `"${ticket.ticketNumber}","${ticket.customer?.name || ""}","${ticket.customer?.company || ""}","${ticket.category}","${getPriorityLabel(ticket.priority)}","${ticket.title}","${getServiceStatusLabel(ticket.status)}","${ticket.assignedTo?.name || ""}","${formatDate(ticket.createdAt)}",${ticket.actualDays || ""}\n`;
        }
        break;
      }

      case "customer": {
        const customers = await prisma.customer.findMany({
          include: {
            assignedTo: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                orders: true,
                communications: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        csvContent = "고객명,이메일,전화번호,회사명,등급,상태,담당자,주문수,커뮤니케이션수,등록일\n";
        for (const customer of customers) {
          csvContent += `"${customer.name}","${customer.email || ""}","${customer.phone || ""}","${customer.company || ""}","${getGradeLabel(customer.grade)}","${getCustomerStatusLabel(customer.status)}","${customer.assignedTo?.name || ""}",${customer._count.orders},${customer._count.communications},"${formatDate(customer.createdAt)}"\n`;
        }
        break;
      }

      case "inventory": {
        const items = await prisma.inventory.findMany({
          orderBy: { productName: "asc" },
        });

        csvContent = "SKU,제품명,카테고리,현재재고,최소재고,최대재고,단가,단위,창고,상태\n";
        for (const item of items) {
          csvContent += `"${item.sku}","${item.productName}","${item.category || ""}",${item.currentStock},${item.minStock},${item.maxStock},${item.unitPrice},"${item.unit}","${item.warehouse || ""}","${getInventoryStatusLabel(item.status)}"\n`;
        }
        break;
      }

      case "project": {
        const projects = await prisma.project.findMany({
          include: {
            owner: {
              select: { name: true },
            },
            _count: {
              select: {
                members: true,
                tasks: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        csvContent = "프로젝트명,상태,우선순위,담당자,멤버수,태스크수,진행률,시작일,종료일\n";
        for (const project of projects) {
          csvContent += `"${project.name}","${getProjectStatusLabel(project.status)}","${getPriorityLabel(project.priority)}","${project.owner?.name || ""}",${project._count.members},${project._count.tasks},${project.progress}%,"${project.startDate ? formatDate(project.startDate) : ""}","${project.endDate ? formatDate(project.endDate) : ""}"\n`;
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: "유효하지 않은 내보내기 유형입니다." },
          { status: 400 }
        );
    }

    const typeLabels: Record<string, string> = {
      sales: "영업",
      service: "AS",
      customer: "고객",
      inventory: "재고",
      project: "프로젝트",
    };

    const fileName = `${typeLabels[type] || type}_리포트_${formatDateForFile(new Date())}.csv`;

    return new NextResponse(BOM + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error("CSV 내보내기 오류:", error);
    return NextResponse.json(
      { error: "CSV를 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 헬퍼 함수들
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateForFile(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "상담",
    quoted: "제안",
    negotiating: "협상",
    confirmed: "계약",
    delivered: "완료",
    cancelled: "취소",
  };
  return labels[status] || status;
}

function getServiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: "접수",
    inspecting: "검사",
    repairing: "수리",
    completed: "완료",
    returned: "반환",
  };
  return labels[status] || status;
}

function getGradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    vip: "VIP",
    gold: "Gold",
    normal: "일반",
    new: "신규",
  };
  return labels[grade] || grade;
}

function getCustomerStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "활성",
    inactive: "비활성",
    dormant: "휴면",
  };
  return labels[status] || status;
}

function getInventoryStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    in_stock: "정상",
    low_stock: "부족",
    out_of_stock: "품절",
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "낮음",
    medium: "보통",
    high: "높음",
    urgent: "긴급",
  };
  return labels[priority] || priority;
}

function getProjectStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    planning: "기획",
    active: "진행",
    on_hold: "보류",
    completed: "완료",
    cancelled: "취소",
  };
  return labels[status] || status;
}
