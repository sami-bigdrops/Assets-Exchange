import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db/db";
import { tenants, personalizations } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    
    const existingTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);

    let tenant = existingTenant;
    const tenantExistedBefore = existingTenant.length > 0;

    if (tenant.length === 0) {
      const newTenants = await db
        .insert(tenants)
        .values({
          slug: tenantSlug,
          name: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
        })
        .returning();
      
      if (newTenants.length === 0) {
        return NextResponse.json(
          { message: "Failed to create tenant" },
          { status: 500 }
        );
      }
      
      tenant = [newTenants[0]!];
    }

    const personalization = await db
      .select()
      .from(personalizations)
      .where(
        and(
          eq(personalizations.tenantId, tenant[0]!.id),
          eq(personalizations.isActive, true)
        )
      )
      .limit(1);

    if (personalization.length === 0) {
      if (tenantExistedBefore) {
        const defaultPersonalization = await db
          .insert(personalizations)
          .values({
            tenantId: tenant[0]!.id,
            logo: null,
            favicon: null,
            secondaryLogo: null,
            colors: null,
            buttonColors: null,
            metricCardColors: null,
            isActive: true,
          })
          .returning();

        if (defaultPersonalization.length === 0) {
          return NextResponse.json(null);
        }

        return NextResponse.json({
          logo: null,
          favicon: null,
          secondaryLogo: null,
          colors: null,
          buttonColors: null,
          metricCardColors: null,
        });
      } else {
        return NextResponse.json(null);
      }
    }

    const personalizationData = personalization[0]!;
    return NextResponse.json({
      logo: personalizationData.logo ?? null,
      favicon: personalizationData.favicon ?? null,
      secondaryLogo: personalizationData.secondaryLogo ?? null,
      colors: personalizationData.colors ?? null,
      buttonColors: personalizationData.buttonColors ?? null,
      metricCardColors: personalizationData.metricCardColors ?? null,
    });
  } catch (error) {
    console.error("Error fetching personalization:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const body = await request.json();
    const { tenant: tenantSlug } = await params;

    let tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);

    if (tenant.length === 0) {
      const newTenants = await db
        .insert(tenants)
        .values({
          slug: tenantSlug,
          name: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
        })
        .returning();
      
      if (newTenants.length === 0) {
        return NextResponse.json(
          { message: "Failed to create tenant" },
          { status: 500 }
        );
      }
      
      tenant = [newTenants[0]!];
    }

    const existing = await db
      .select()
      .from(personalizations)
      .where(
        and(
          eq(personalizations.tenantId, tenant[0]!.id),
          eq(personalizations.isActive, true)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(personalizations)
        .set({
          logo: body.logo ?? null,
          favicon: body.favicon ?? null,
          secondaryLogo: body.secondaryLogo ?? null,
          colors: body.colors ?? null,
          buttonColors: body.buttonColors ?? null,
          metricCardColors: body.metricCardColors ?? null,
          updatedAt: new Date(),
        })
        .where(eq(personalizations.id, existing[0]!.id));
    } else {
      await db.insert(personalizations).values({
        tenantId: tenant[0]!.id,
        logo: body.logo ?? null,
        favicon: body.favicon ?? null,
        secondaryLogo: body.secondaryLogo ?? null,
        colors: body.colors ?? null,
        buttonColors: body.buttonColors ?? null,
        metricCardColors: body.metricCardColors ?? null,
        isActive: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving personalization:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
