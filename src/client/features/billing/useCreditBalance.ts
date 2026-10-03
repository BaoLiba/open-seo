import { useCustomer } from "autumn-js/react";
import { useSession } from "@/lib/auth-client";
import {
  getCustomerPaidPlanId,
  getCustomerPlanStatus,
} from "@/client/features/billing/plan-detection";
import {
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
  LOW_CREDITS_THRESHOLD_USD,
  autumnSeoDataCreditsToUsd,
} from "@/shared/billing";

type CustomerParams = NonNullable<Parameters<typeof useCustomer>[0]>;

/** The signed-in organization's Autumn customer, plan, and remaining credits in USD. */
export function useCreditBalance({
  expand,
}: { expand?: CustomerParams["expand"] } = {}) {
  const session = useSession();
  const customerQuery = useCustomer({
    expand,
    queryOptions: {
      enabled: Boolean(session.data?.user?.id),
    },
  });

  const customer = customerQuery.data;
  const balances = customer?.balances;
  const monthlyBalance = balances?.[AUTUMN_SEO_DATA_BALANCE_FEATURE_ID];
  const monthlyRemaining = autumnSeoDataCreditsToUsd(
    monthlyBalance?.remaining ?? 0,
  );
  const topUpRemaining = autumnSeoDataCreditsToUsd(
    balances?.[AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID]?.remaining ?? 0,
  );
  const totalRemaining = monthlyRemaining + topUpRemaining;
  // A paid plan canceled at period end ends then instead of refilling.
  const paidSubscription = customer?.subscriptions?.find(
    (subscription) => subscription.planId === getCustomerPaidPlanId(customer),
  );
  const isOutOfCredits = totalRemaining <= 0;

  return {
    session,
    customerQuery,
    isFreePlan: getCustomerPlanStatus(customer) === "free",
    monthlyRemaining,
    topUpRemaining,
    totalRemaining,
    isOutOfCredits,
    isLowCredits: !isOutOfCredits && totalRemaining < LOW_CREDITS_THRESHOLD_USD,
    // When monthly credits refill, e.g. "Oct 12". Null for the free plan's
    // one-time credits and for a canceled plan, which never refill.
    refillDate:
      monthlyBalance?.nextResetAt && !paidSubscription?.canceledAt
        ? new Date(monthlyBalance.nextResetAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : null,
  };
}
