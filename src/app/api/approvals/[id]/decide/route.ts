import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/approvals/[id]/decide - Approve or reject a step
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, comment } = body;

    if (!action || !["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { error: "유효한 결재 액션을 지정해주세요. (approved, rejected)" },
        { status: 400 }
      );
    }

    // Get the approval with its steps
    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "해당 결재를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (approval.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 결재입니다." },
        { status: 400 }
      );
    }

    // Find the current step that needs to be decided
    // The current step is the first pending step in order
    const currentStep = approval.steps.find(
      (step) => step.status === "pending"
    );

    if (!currentStep) {
      return NextResponse.json(
        { error: "결재할 단계가 없습니다." },
        { status: 400 }
      );
    }

    // Verify the current user is the approver for this step
    if (currentStep.approverId !== session.user.id) {
      return NextResponse.json(
        { error: "현재 결재 순서가 아닙니다. 본인 차례에 결재할 수 있습니다." },
        { status: 403 }
      );
    }

    // Update the step
    await prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: action,
        comment: comment || null,
        decidedAt: new Date(),
      },
    });

    // Determine the new approval status
    if (action === "rejected") {
      // If any step is rejected, the whole approval is rejected
      await prisma.approval.update({
        where: { id },
        data: { status: "rejected" },
      });
    } else if (action === "approved") {
      // Check if all steps are now approved
      const remainingPendingSteps = approval.steps.filter(
        (step) => step.id !== currentStep.id && step.status === "pending"
      );

      if (remainingPendingSteps.length === 0) {
        // All steps approved
        await prisma.approval.update({
          where: { id },
          data: { status: "approved" },
        });
      }
      // Otherwise, the approval stays pending for the next step
    }

    // Fetch the updated approval
    const updatedApproval = await prisma.approval.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            department: true,
            position: true,
          },
        },
        steps: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                department: true,
                position: true,
              },
            },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    return NextResponse.json(updatedApproval);
  } catch (error) {
    console.error("Approval decide error:", error);
    return NextResponse.json(
      { error: "결재 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
