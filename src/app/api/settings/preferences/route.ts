import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    let preference = await prisma.userPreference.findUnique({
      where: { userId: session.user!.id! },
    });

    if (!preference) {
      preference = await prisma.userPreference.create({
        data: { userId: session.user!.id! },
      });
    }

    return NextResponse.json(preference);
  } catch (error) {
    console.error("Preferences GET error:", error);
    return NextResponse.json({ error: "설정을 불러오는데 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const {
      theme, language, emailNotify, pushNotify, taskReminder,
      approvalNotify, chatNotify, hiddenWidgets, dashboardLayout, sidebarCollapsed,
      enabledMenus,
    } = body;

    const data: Record<string, unknown> = {};
    if (theme !== undefined) data.theme = theme;
    if (language !== undefined) data.language = language;
    if (emailNotify !== undefined) data.emailNotify = emailNotify;
    if (pushNotify !== undefined) data.pushNotify = pushNotify;
    if (taskReminder !== undefined) data.taskReminder = taskReminder;
    if (approvalNotify !== undefined) data.approvalNotify = approvalNotify;
    if (chatNotify !== undefined) data.chatNotify = chatNotify;
    if (hiddenWidgets !== undefined) data.hiddenWidgets = typeof hiddenWidgets === "string" ? hiddenWidgets : JSON.stringify(hiddenWidgets);
    if (dashboardLayout !== undefined) data.dashboardLayout = typeof dashboardLayout === "string" ? dashboardLayout : JSON.stringify(dashboardLayout);
    if (sidebarCollapsed !== undefined) data.sidebarCollapsed = sidebarCollapsed;
    if (enabledMenus !== undefined) data.enabledMenus = typeof enabledMenus === "string" ? enabledMenus : JSON.stringify(enabledMenus);

    const preference = await prisma.userPreference.upsert({
      where: { userId: session.user!.id! },
      update: data,
      create: { userId: session.user!.id!, ...data },
    });

    return NextResponse.json({ message: "설정이 저장되었습니다.", preference });
  } catch (error) {
    console.error("Preferences PUT error:", error);
    return NextResponse.json({ error: "설정 저장에 실패했습니다." }, { status: 500 });
  }
}
