import { publicClient } from "./apiClient.ts";

const authService = {
  loginAdmin: async (username: string, password: string): Promise<any> => {
    const response = await publicClient.post("/auth/login/admin", {
      username,
      password,
    });
    return response.data;
  },
};

export default authService;
