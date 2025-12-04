import { privateClient } from "./apiClient";

const dashboardService = {
  getOverview: async () => {
    const response = await privateClient.get("/dashboard/overview");
    return response.data;
  },

  getActivities: async (limit: number = 10) => {
    const response = await privateClient.get("/dashboard/activities", {
      params: { limit },
    });
    return response.data;
  },

  getStats: async (period: string = "today") => {
    const response = await privateClient.get("/dashboard/stats", {
      params: { period },
    });
    return response.data;
  },
};

export default dashboardService;
