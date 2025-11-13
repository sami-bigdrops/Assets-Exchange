import { db } from "@workspace/db/db";
import { tenants, personalizations } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export interface PersonalizationSettings {
  logo?: string | null;
  favicon?: string | null;
  secondaryLogo?: string | null;
  colors?: {
    background: string;
    bodyText: string;
    title: string;
    heading: string;
    sidebarHoverBackground: string;
    sidebarHoverText: string;
    sectionHeaderBackground: string;
    sectionHeadingTextColor: string;
  } | null;
  buttonColors?: {
    primaryButton: string;
    primaryButtonText: string;
    secondaryButton: string;
    secondaryButtonText: string;
    destructiveButton: string;
    destructiveButtonText: string;
  } | null;
  metricCardColors?: {
    cardBackground: string;
    cardTitle: string;
    totalAssetsIconBg: string;
    totalAssetsIconColor: string;
    newRequestsIconBg: string;
    newRequestsIconColor: string;
    approvedAssetsIconBg: string;
    approvedAssetsIconColor: string;
    rejectedAssetsIconBg: string;
    rejectedAssetsIconColor: string;
    pendingApprovalIconBg: string;
    pendingApprovalIconColor: string;
  } | null;
}

export async function getPersonalizationByTenantSlug(
  tenantSlug: string
): Promise<PersonalizationSettings | null> {
  try {
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);

    if (tenant.length === 0) {
      return null;
    }

    const tenantData = tenant[0];
    if (!tenantData) {
      return null;
    }

    const personalization = await db
      .select()
      .from(personalizations)
      .where(
        and(
          eq(personalizations.tenantId, tenantData.id),
          eq(personalizations.isActive, true)
        )
      )
      .limit(1);

    if (personalization.length === 0) {
      return null;
    }

    const personalizationData = personalization[0];
    if (!personalizationData) {
      return null;
    }

    return {
      logo: personalizationData.logo ?? null,
      favicon: personalizationData.favicon ?? null,
      secondaryLogo: personalizationData.secondaryLogo ?? null,
      colors: personalizationData.colors ?? null,
      buttonColors: personalizationData.buttonColors ?? null,
      metricCardColors: personalizationData.metricCardColors ?? null,
    };
  } catch (error) {
    console.error("Error fetching personalization:", error);
    return null;
  }
}

