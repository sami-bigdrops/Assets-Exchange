export type DashboardStats = {
    totals: {
        totalAssets: number
        newRequests: number
        approved: number
        rejected: number
        pending: number
    }
    trends: {
        newRequests: {
            today: number
            yesterday: number
        }
        approved: {
            today: number
            yesterday: number
        }
    }
}
