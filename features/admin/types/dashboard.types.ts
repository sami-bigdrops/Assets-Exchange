export type DashboardStats = {
  totals: {
    totalAssets: number;
    newRequests: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  trends: {
    totalAssets: {
      today: number;
      yesterday: number;
    };
    newRequests: {
      today: number;
      yesterday: number;
    };
    approved: {
      today: number;
      yesterday: number;
    };
    rejected: {
      today: number;
      yesterday: number;
    };
    pending: {
      today: number;
      yesterday: number;
    };
  };
  historicalData: {
    totalAssets: {
      yesterday: number;
      currentMonth: number;
      lastMonth: number;
    };
    newRequests: {
      yesterday: number;
      currentMonth: number;
      lastMonth: number;
    };
    approved: {
      yesterday: number;
      currentMonth: number;
      lastMonth: number;
    };
    rejected: {
      yesterday: number;
      currentMonth: number;
      lastMonth: number;
    };
    pending: {
      yesterday: number;
      currentMonth: number;
      lastMonth: number;
    };
  };
};
