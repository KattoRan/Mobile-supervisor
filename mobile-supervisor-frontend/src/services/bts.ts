import { privateClient } from "./apiClient";

const btsService = {
  getByBoundingBox: async (params: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) => {
    const response = await privateClient.get("/bts", { params });
    return response.data;
  },

  //   getById: async (id: string) => {
  //     const response = await privateClient.get(`/bts/${id}`);
  //     return response.data;
  //   },

  //   getAll: async () => {
  //     const response = await privateClient.get("/bts");
  //     return response.data;
  //   },
};

export default btsService;
